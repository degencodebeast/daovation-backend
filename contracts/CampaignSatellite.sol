// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import {IAxelarGasService} from "@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/AddressString.sol";
import {StringToBytes32, Bytes32ToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/Bytes32String.sol";
import {Upgradable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";

contract CampaignSatellite is AxelarExecutable, Upgradable {
    IAxelarGasService public immutable gasService;

    using StringToAddress for string;
    using AddressToString for address;

    error AlreadyInitialized();

    error NotSigner();

    string public chainName;

    string public hubChain;
    address public hubChainAddr;
    uint256 public immutable targetSecondsPerBlock;

    bytes4 immutable SEND_DONATION_DATA_TO_HUB_SELECTOR =
        bytes4(keccak256("sendDonationDataToHub(uint256)")); //1 - requestCollection
    bytes4 immutable SET_CAMPAIGN_SELECTOR =
        bytes4(
            keccak256(
                "setCampaignOnRemote(address, uint256, uint256, string, bool, address)"
            )
        ); //0 - crossChainPropose
    bytes4 immutable ON_RECEIVE_DONATION_DATA_SELECTOR =
        bytes4(
            keccak256("onReceiveSpokeDonationData(uint256, uint256, address[])")
        );
    bytes4 immutable REMOTE_EXECUTE_WITHDRAWAL_SELECTOR =
        bytes4(keccak256("executeWithdrawal(uint256)"));

    uint256[] public allCampaignIds;

    //mapping(uint256 => RemoteCampaign) public campaigns;
    //mapping(uint256 => CampaignData) public campaigns;

    //mapping to store all campaigns on this chain
    mapping(uint256 => RemoteCampaign) public campaignIdToCampaigns;
    mapping(uint256 => CampaignDonationData) public campaignDonationData;
    mapping(uint256 => address) public idToCampaignAddress;
    mapping(address => uint256) public campaignAddrToIds;
    mapping(uint256 => address) public campaignIdToOwner;

    RemoteCampaign[] public allCampaignData;
    //mapping(uint256 => Donors) public campaignIdToDonors;
    address[] public allCampaignAddresses;

    struct CampaignDonationData {
        //string campaignCID;
        //address campaignOwner;
        //uint256 campaignId;
        uint256 raisedFunds;
        //bool hasReachedTarget;
        address[] donors;
    }

    struct Donors {
        address donorAddress;
        uint256 amountDonated;
    }

    Donors[] public allSpokeDonors;

    //remote campaigns
    struct RemoteCampaign {
        //Blocks provided by the hub chain as to when the local values should start/finish
        address campaignAddress;
        uint256 campaignId;
        uint256 timeCampaignStarted;
        string campaignCID;
        bool campaignFinished;
        address campaignOwner;
    }

    //campaign data
    // struct CampaignData {
    //     //string campaignCID;
    //     address campaignOwner;
    //     uint256 campaignId;
    //     uint256 raisedFunds;
    //     bool hasReachedTarget;
    //     address[] donators;
    // }

    enum CampaignStatus {
        Finished,
        Ongoing
    }

    constructor(
        string memory _hubChain,
        address _hubChainAddr,
        address _gateway,
        address _gasService,
        uint _targetSecondsPerBlock
    ) payable AxelarExecutable(_gateway) {
        gasService = IAxelarGasService(_gasService);
        hubChain = _hubChain;
        hubChainAddr = _hubChainAddr;
        targetSecondsPerBlock = _targetSecondsPerBlock;
    }

    //checks whether a campaign exists in the contract by checking if the localVoteStart variable of the corresponding
    //campaign in the campaigns mapping has been set to a non-zero value.
    function isCampaign(uint256 _campaignId) public view returns (bool) {
        return campaignIdToCampaigns[_campaignId].timeCampaignStarted != 0;
    }

    function _setup(bytes calldata params) internal override {
        string memory chainName_ = abi.decode(params, (string));
        if (bytes(chainName).length != 0) revert AlreadyInitialized();
        chainName = chainName_;
    }

    function contractId() external pure returns (bytes32) {
        return keccak256("example");
    }

    function _execute(
        string calldata /*sourceChain*/,
        string calldata sourceAddress,
        bytes calldata _payload
    ) internal override {
        string memory hubAddrString = hubChainAddr.toString();
        require(
            keccak256(abi.encodePacked(sourceAddress)) ==
                keccak256(abi.encodePacked(hubAddrString)),
            "Only messages from the hub chain can be received!"
        );

        bytes calldata payloadNoSig = _payload[4:];
        bytes4 selector = getSelector(_payload);

        // Do 1 of 2 things:
        //Begin campaign on the chain, with local block times
        if (selector == SET_CAMPAIGN_SELECTOR) {
            setCampaignOnRemote(payloadNoSig);
        } else if (selector == SEND_DONATION_DATA_TO_HUB_SELECTOR) {
            sendDonationDataToHub(sourceAddress, payloadNoSig);
        } else {
            revert("Invalid payload: no selector match");
        }
    }

    function getSelector(
        bytes memory _data
    ) internal pure returns (bytes4 sig) {
        assembly {
            sig := mload(add(_data, 32))
        }
    }

    function setCampaignOnRemote(bytes calldata _payload) internal {
        (
            address campaignAddress,
            uint256 campaignId,
            uint256 campaignStart,
            string memory campaignCID,
            bool campaignFinished,
            address campaignOwner //can only be read on source chain
        ) = abi.decode(
                _payload,
                (address, uint256, uint256, string, bool, address)
            );
        require(
            !isCampaign(campaignId),
            "Campaign ID must be unique, and not already set"
        );

        uint256 cutOffBlockEstimation = 0;
        if (campaignStart < block.timestamp) {
            uint256 blockAdjustment = (block.timestamp - campaignStart) /
                targetSecondsPerBlock; //to get how many blocks have passed since the campaign started on the hubchain
            if (blockAdjustment < block.number) {
                cutOffBlockEstimation = block.number - blockAdjustment; //to get block number of when campaign should
                // have started on this chain, so block.number - number of blocks that have passed since the campaign started on the hub chain
            } else {
                cutOffBlockEstimation = block.number;
            }
        } else {
            cutOffBlockEstimation = block.number;
        }

        campaignIdToCampaigns[campaignId] = RemoteCampaign(
            campaignAddress,
            campaignId,
            cutOffBlockEstimation, //block number at which proposal started on this chain
            campaignCID,
            campaignFinished,
            campaignOwner
        );
        allCampaignIds.push(campaignId);
        allCampaignData.push(campaignIdToCampaigns[campaignId]);
        allCampaignAddresses.push(campaignAddress);
        idToCampaignAddress[campaignId] = campaignAddress;
        campaignAddrToIds[campaignAddress] = campaignId;
        campaignIdToOwner[campaignId] = campaignOwner;
    }

    function sendDonationDataToHub(
        string memory sourceAddress,
        bytes calldata _payload
    ) internal {
        //send vote results back to the hub chain
        uint256 campaignId = abi.decode(_payload, (uint256));

        CampaignDonationData storage donationData = campaignDonationData[
            campaignId
        ];
        bytes memory donationPayload = abi.encodeWithSignature(
            "onReceiveSpokeDonationData(uint256, uint256, address[])",
            campaignId,
            donationData.raisedFunds,
            donationData.donors
        );

        // Send a cross-chain message with axelar to the chain in the iterator
        // NOTE: DAOSatellite needs to be funded beforehand, in the constructor.
        // There are better solutions, such as cross-chain swaps being built in from the hub chain, but
        // this is the easiest solution for demonstration purposes.
        gasService.payNativeGasForContractCall{value: 0.1 ether}(
            address(this), //sender
            hubChain, //destination chain
            sourceAddress, //destination contract address, would be same address with address(this) since we are using constant address deployer
            donationPayload, //payload
            payable(address(this))
        );

        gateway.callContract(
            hubChain, //destination chain
            sourceAddress, //destination contract address, would be same address with address(this) since we are using constant address deployer, if not using constant deployer then will be "hubChainAddr"
            donationPayload //payload
        );
        campaignIdToCampaigns[campaignId].campaignFinished = true;

        //The only issue here is that the gas payment for the cross-chain message's transaction on the hub chain must be included, and there is no simple way to
        // receive it. There are options that could potentially avert this issue, as explained below, but for simplicity's sake, the satellite contract will have
        //to be sent native currency every once in a while.
    }

    // function crossChainDonate(
    //     uint256 _campaignId,
    //     uint256 _amount,
    //     address payable _depositAddress
    // ) public payable virtual {
    //     RemoteCampaign storage campaign = campaignIdToCampaigns[_campaignId];
    //     require(!campaign.campaignFinished, "campaign has been completed");
    //     require(isCampaign(_campaignId), "not a valid campaign");
    //     require(
    //         msg.value > _amount,
    //         "sent amount is lower than amount you want to donate"
    //     );
    //     _depositAddress.transfer(msg.value);
    // }

    function crossChainDonate(
        uint256 _campaignId,
        //uint256 amount,
        bytes memory payload,
        bytes memory signature
    ) public payable virtual returns (bool) {
        //RemoteCampaign storage campaign = campaignIdToCampaigns[_campaignId];
        //require(!campaign.campaignFinished, "campaign has been completed");
        require(isCampaign(_campaignId), "not a valid campaign");
        //address campaignAddr = idToCampaignAddress[_campaignId];
        address signer = msg.sender;
        bool result = verify(signer, payload, signature);
        if (result) {
            return result;
        }else {
            revert NotSigner();
        }
    }

    function verify(
        address _signer,
        bytes memory _payload,
        bytes memory _signature
    ) public pure returns (bool) {
        bytes32 payloadHash = getPayloadHash(_payload);
        bytes32 ethSignedPayloadHash = getEthSignedPayloadHash(payloadHash);

        //we'll take the ethSignedMessageHash and verify it with the signature and this
        //will recover the signer, so we'll check the signer that was returned is equal to
        //the signer from the input

        //this recover returns the signer of the message
        return recover(ethSignedPayloadHash, _signature) == _signer;
    }

    function getPayloadHash(
        bytes memory _payload
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(_payload));
    }

    function getEthSignedPayloadHash(
        bytes32 _payloadHash
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    _payloadHash
                )
            );
    }

    //this function wil take the signed message hash and the signature of the message
    //and use it to recover the signer of the message
    function recover(
        bytes32 ethSignedPayloadHash,
        bytes memory _signature
    ) public pure returns (address) {
        //we'll have to split the signature into three parts
        //r and s are cryptographic parameters used for digital signatures
        //v is something unique to ethereum
        (bytes32 r, bytes32 s, uint8 v) = _split(_signature);
        return ecrecover(ethSignedPayloadHash, v, r, s);
    }

    //this _signature variable here is not the actual signature
    //it is the pointer to where the signature is stored in memory
    function _split(
        bytes memory _signature
    ) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(_signature.length == 65, "invalid signature length");

        //this will load into memory the variable r, from the pointer that we
        //provide as an input into mload

        // signature length = 65, but there are extra 32 bytes stored in front of the signature, it stores the length of the signature
        // 32 (len) + 65 (sig) = 97
        assembly {
            //it will load to memory 32bytes from the pointer that we provide into the mload input
            //the first 32 bytes of _signature is the length of the signature, so we need
            //to skip it by typing add 32 bytes to the signature pointer length, to get the location where r is stored
            r := mload(add(_signature, 32)) //again we're saying that from the pointer of signature, skip the first 32 bytes
            //cause it holds the signature length, after we skip the first 32 bytes, the value for r is stored in the next 32 bytes
            s := mload(add(_signature, 64)) //same thing here from the pointer of signature, skip the first 32 bytes cause it
            //holds the signature length, then skip the next 32 bytes cause it holds the value for r, then the value for s is stored on
            //the next 32 after r's 32 bytes
            v := byte(0, mload(add(_signature, 96))) //same thing here from the pointer of signature, skip the first 32 bytes cause it
            //holds the signature length, then skip the next 32 bytes cause it holds the value for r, then skip the next 32 bytes cause
            //the value of s, then the value for v is stored on the next 32 bytes after r's 32 bytes and s' 32 bytes, but remember that
            //we only need the first byte, so we'll use byte(0, mload(memory_location_of_v)) to get the first byte into v
        }
    }

    //function countDonations(uint256 _campaignId) internal virtual {}

    function getAllCampaignIds()
        public
        view
        returns (uint256[] memory _allCampaignIds)
    {
        _allCampaignIds = allCampaignIds;
    }

    function getAllCampaignData()
        public
        view
        returns (RemoteCampaign[] memory)
    {
        return allCampaignData;
    }

    function getParticularCampaignData(
        uint256 _proposalId
    ) public view returns (RemoteCampaign memory campaignData) {
        campaignData = campaignIdToCampaigns[_proposalId];
    }

    function getParticularCampaign(
        uint256 _campaignId
    ) public view returns (address _campaign) {
        _campaign = idToCampaignAddress[_campaignId];
    }

    function getParticularCampaignId(
        address campaign
    ) public view returns (uint256 _campaignId) {
        _campaignId = campaignAddrToIds[campaign];
    }

    function getCampaignOwner(
        uint256 _campaignId
    ) public view returns (address owner) {
        owner = campaignIdToOwner[_campaignId];
    }

    receive() external payable {
        // Handle the received Ether here
    }
}
