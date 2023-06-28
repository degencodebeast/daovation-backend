//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./Campaign.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
//import "@openzeppelin/contracts/utils/Counters.sol";

//import "@openzeppelin/contracts/access/AccessControl.sol";

import {IAxelarGasService} from "@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {Upgradable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/AddressString.sol";
import {StringToBytes32, Bytes32ToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/Bytes32String.sol";

import "./CampaignCountingSimple.sol";

contract CampaignManager is CampaignCountingSimple, AxelarExecutable, Ownable {
    IAxelarGasService public immutable gasService;
    using StringToAddress for string;
    using AddressToString for address;

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
        ); // - onReceiveSpokeVotingData
    bytes4 immutable REMOTE_EXECUTE_WITHDRAWAL_SELECTOR =
        bytes4(keccak256("executeWithdrawal(uint256)"));

    uint256 public campaignIdCounter = 1;
    Campaign[] allCampaigns;
    mapping(address => Campaign[]) public ownerToCampaigns;
    mapping(address => uint256[]) public ownerToCampaignIds;
    mapping(uint256 => address) public campaignIdToOwner;
    mapping(uint256 => Campaign) public idToCampaigns;
    mapping(Campaign => uint256) public campaignToIds;
    mapping(uint256 => Donors[]) public campaignIdToDonors;
    mapping(Campaign => Donors) public donors;
    mapping(Campaign => bool) public isCampaign;

    uint256[] public allCampaignIds;

    //event CampaignCreatedPayload(bytes);

    event CampaignCreated(uint256 campaignId);

    // event campaignRemoved(uint256 campaignId);

    mapping(uint256 => bool) public collectionFinished;
    mapping(uint256 => bool) public collectionStarted;

    struct Donors {
        address donorAddress;
        uint256 amountDonated;
    }

    Donors[] public _ALL_DONORS;

    // struct CampaignData {
    //     uint256 campaignId;
    //     string campaignCID;
    //     address campaignOwner;
    //     uint256 campaignStart;
    // }

    //CampaignData[] public allCampaignData;

    constructor(
        address _gateway,
        address _gasService,
        bytes memory _spokeChains,
        bytes memory _spokeChainNames
    )
        AxelarExecutable(_gateway)
        CampaignCountingSimple(_spokeChains, _spokeChainNames)
    {
        gasService = IAxelarGasService(_gasService);
    }

    function createCampaign(
        string memory _campaignCID,
        uint256 _target,
        address _campaignSatelliteAddr,
        uint256[] memory spokeChainFees
    ) public payable virtual returns (uint256) {
        uint256 totalFee;
        for (uint i = 0; i < spokeChainFees.length; i++) {
            totalFee += spokeChainFees[i];
        }
        require(msg.value >= totalFee, "insufficient gas fee for transaction");

        uint256 campaignID = campaignIdCounter;
        campaignIdCounter++;

        Campaign campaign = new Campaign(
            msg.sender,
            _campaignCID,
            block.timestamp,
            _target,
            campaignID
        );
        allCampaigns.push(campaign);
        allCampaignIds.push(campaignID);
        ownerToCampaigns[msg.sender].push(campaign);
        ownerToCampaignIds[msg.sender].push(campaignID);
        idToCampaigns[campaignID] = campaign;
        campaignToIds[campaign] = campaignID;
        campaignIdToOwner[campaignID] = msg.sender;
        isCampaign[campaign] = true;
        //emit CampaignCreated(campaignID);

        //  CampaignData memory _campaignData = CampaignData(
        //     _campaignID,
        //     _campaignCID.
        //     msg.sender,
        //     _proposalTimeStart
        // );
        // allCampaignData.push(_campaignData);

        //sends the campaign to all of the other chains
        if (spokeChains.length > 0) {
            //Iterate over every spoke chain
            for (uint16 i = 0; i < spokeChains.length; i++) {
                uint256 crossChainFee = spokeChainFees[i];

                bytes memory payload = abi.encodeWithSignature(
                    "setCampaignOnRemote(address, uint256, uint256, string, bool, address)",
                    address(campaign),
                    campaignID,
                    block.timestamp,
                    _campaignCID,
                    false,
                    msg.sender
                );

                emit CampaignCreated(campaignID);
                // Send a cross-chain message with axelar to the chain in the iterator
                gasService.payNativeGasForContractCall{value: crossChainFee}(
                    address(this), //sender
                    spokeChainNames[i], //destination chain
                    _campaignSatelliteAddr.toString(),
                    payload,
                    msg.sender //refund address //payable(address(this)) //test this later to see the one that is necessary to suit your needs
                );

                gateway.callContract(
                    spokeChainNames[i],
                    _campaignSatelliteAddr.toString(),
                    payload
                );
            }
        }

        return campaignID;
    }

    function getOwnerCampaigns()
        public
        view
        returns (Campaign[] memory _allOwnerCampaigns)
    {
        _allOwnerCampaigns = ownerToCampaigns[msg.sender];
    }

    function getOwnerIds() public view returns (uint256[] memory _allOwnerIds) {
        _allOwnerIds = ownerToCampaignIds[msg.sender];
    }

    function getParticularCampaign(
        uint256 _campaignId
    ) public view returns (Campaign _campaign) {
        _campaign = idToCampaigns[_campaignId];
    }

    function getParticularCampaignId(
        Campaign campaign
    ) public view returns (uint256 _campaignId) {
        _campaignId = campaignToIds[campaign];
    }

    function getCampaignOwner(
        uint256 _campaignId
    ) public view returns (address owner) {
        owner = campaignIdToOwner[_campaignId];
    }

    function getAllCampaigns()
        public
        view
        returns (Campaign[] memory _allCampaigns)
    {
        _allCampaigns = allCampaigns;
    }

    function getAddressBalance(address account) public view returns (uint256) {
        return account.balance;
    }

    function getAllCampaignIds()
        public
        view
        returns (uint256[] memory _allCampaignIds)
    {
        _allCampaignIds = allCampaignIds;
    }

    function claim(uint256 _campaignId, uint256 amount) external virtual {
        address owner = campaignIdToOwner[_campaignId];
        require(
            msg.sender == owner,
            "msg.sender is not the owner of this campaign"
        );

        Campaign campaign = idToCampaigns[_campaignId];
        Campaign campaignInstance = Campaign(campaign);
        campaignInstance.withdraw(amount);

        // (bool success, ) = address(campaign).delegatecall(
        //     abi.encodeWithSignature("withdraw(uint256)", amount)
        // );
        // require(success, "Call failed");
    }

    function getParticularCampaignDonors(
        uint256 _campaignId
    ) public view returns (Donors[] memory _donors) {
        _donors = campaignIdToDonors[_campaignId];
    }

    function getAllDonors()
        public
        view
        returns (Donors[] memory _allDonorsData)
    {
        _allDonorsData = _ALL_DONORS;
    }

    //can only be called by DAO, might be expensive for now, could refactor later to
    //optimize for gas
    function removeCampaignAddr(Campaign campaign) public onlyOwner {
        uint index = findCampaignAddrIndex(campaign);
        require(index < allCampaigns.length, "Element not found");

        // Move the last element to the index being deleted
        allCampaigns[index] = allCampaigns[allCampaigns.length - 1];

        // Decrease the array length
        allCampaigns.pop();
        //uint256 campaignId = getParticularCampaignId(campaign);
        //emit campaignRemoved(campaignId);
    }

    function findCampaignAddrIndex(
        Campaign campaign
    ) internal view returns (uint) {
        for (uint i = 0; i < allCampaigns.length; i++) {
            if (allCampaigns[i] == campaign) {
                return i;
            }
        }
        return allCampaigns.length; // Element not found, return an invalid index
    }

    // function that checks whether or not that each of the spoke chains have sent in donation data before
    // allowing a withdrawal (which is found by checking completed on a campaign on all chains)

    // function _beforeWithdrawal(uint256 _campaignId) public {
    //     finishCollectionPhase(_campaignId);

    //     require(
    //         collectionFinished[_campaignId],
    //         "Collection phase for this proposal is unfinished!"
    //     );

    //     //callwithdraw
    // }

    //function that marks a collection phase as true if all of the spoke chains have
    //sent a cross-chain message back
    function finishCollectionPhase(uint256 _campaignId) public {
        bool phaseFinished = true;
        //loop will only run as long as phaseFinished == true
        for (uint16 i = 0; i < spokeChains.length && phaseFinished; i++) {
            phaseFinished =
                phaseFinished &&
                campaignIdToChainIdToSpokeDonationData[_campaignId][
                    spokeChains[i]
                ].initialized;
        }

        collectionFinished[_campaignId] = phaseFinished; //this sets the collection of the proposalId on all chains as finished
    }

    function requestCollections(
        uint256 _campaignId,
        address _satelliteAddr,
        uint256[] memory spokeChainFees
    ) public payable {
        require(
            !collectionStarted[_campaignId],
            "Collection phase for this proposal has already started"
        );

        uint256 totalFee;
        for (uint i = 0; i < spokeChainFees.length; i++) {
            totalFee += spokeChainFees[i];
        }
        require(msg.value >= totalFee, "insufficient gas fee for transaction");

        collectionStarted[_campaignId] = true;

        for (uint16 i = 0; i < spokeChains.length; i++) {
            uint256 crossChainFee = spokeChainFees[i];
            bytes memory payload = abi.encodeWithSignature(
                "sendDonationDatatoHub(uint256)",
                _campaignId
            );
            gasService.payNativeGasForContractCall{value: crossChainFee}(
                address(this), //sender
                spokeChainNames[i], //destination chain
                _satelliteAddr.toString(),
                payload,
                msg.sender //refund address //payable(address(this)) //test this later to see the one that is necessary to suit your needs
            );

            gateway.callContract(
                spokeChainNames[i],
                _satelliteAddr.toString(),
                payload
            );
        }
    }

    function _execute(
        string calldata sourceChain,
        string calldata /*sourceAddress*/,
        bytes calldata _payload
    ) internal override {
        uint32 _srcChainId = spokeChainNameToSpokeChainId[sourceChain];

        bytes calldata payloadNoSig = _payload[4:];
        bytes4 selector = getSelector(_payload);

        // Some options for cross-chain actions are: propose, vote, vote with reason,
        // vote with reason and params, cancel, etc.
        if (selector == ON_RECEIVE_DONATION_DATA_SELECTOR) {
            onReceiveSpokeDonationData(_srcChainId, payloadNoSig);
        } else if (selector == REMOTE_EXECUTE_WITHDRAWAL_SELECTOR) {
            // TODO: Feel free to put your own cross-chain actions (propose, execute, etc.)
            enableWithdrawal();
        } else {
            // You could revert here if you wanted to
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

    function enableWithdrawal() public pure returns (string memory message) {
        message = "You just called the execute withdrawal function from another chain";
    }

    function crossChainDonate(
        uint256 _campaignId,
        uint256 _amount //address payable _recipient
    ) public payable virtual {
        Campaign campaign = idToCampaigns[_campaignId];
        require(
            address(campaign) != address(0),
            "campaign cannot be zero address"
        );
        require(
            isCampaign[campaign] == true,
            "donating to an invalid campaign"
        );
        require(
            msg.value > _amount,
            "sent amount is lower than amount you want to donate"
        );

        address campaignAddr = address(campaign);
        address payable _recipient = payable(campaignAddr);
        donors[campaign] = Donors(msg.sender, _amount);
        Donors memory donorsData = donors[campaign];
        _ALL_DONORS.push(donorsData);
        campaignIdToDonors[_campaignId].push(donorsData);
        _recipient.transfer(_amount);
    }

    function onReceiveSpokeDonationData(
        uint32 _srcChainId,
        bytes memory payload
    ) internal virtual {
        (
            uint256 campaignId,
            uint256 raisedFunds,
            address[] memory _donors
        ) = abi.decode(payload, (uint256, uint256, address[]));

        //as long as the received data isn't already initialized.._execute
        if (
            campaignIdToChainIdToSpokeDonationData[campaignId][_srcChainId]
                .initialized
        ) {
            revert("Already initialized");
        } else {
            //Add it to the map (while setting initialized to true)
            campaignIdToChainIdToSpokeDonationData[campaignId][
                _srcChainId
            ] = SpokeCampaignDonationData(
                //campaignOwner,
                //campaignId,
                raisedFunds,
                //hasReachedTarget,
                _donors,
                true
            );
        }
    }
}
