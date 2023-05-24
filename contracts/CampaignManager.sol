//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./Campaign.sol";
import {IAxelarGasService} from "@axelar-network/axelar-cgp-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {Upgradable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/upgradable/Upgradable.sol";
import {StringToAddress, AddressToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/AddressString.sol";
import {StringToBytes32, Bytes32ToString} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/utils/Bytes32String.sol";

import "./CampaignCountingSimple.sol";

contract CampaignManager is CampaignCountingSimple, AxelarExecutable {
    IAxelarGasService public immutable gasService;
    using StringToAddress for string;
    using AddressToString for address;

    uint256 public campaignIdCounter = 1;
    Campaign[] allCampaigns;
    mapping(address => Campaign[]) public ownerToCampaigns;
    mapping(address => uint256[]) public ownerToCampaignIds;
    mapping(uint256 => Campaign) public idToCampaigns;

    uint256[] public allCampaignIds;

    event CampaignCreatedPayload(bytes);

    mapping(uint256 => bool) public collectionFinished;
    mapping(uint256 => bool) public collectionStarted;

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
        address _campaignSatelliteAddr
    ) public payable virtual returns (uint256) {
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

        //sends the proposal to all of the other chains
        if (spokeChains.length > 0) {
            uint256 crossChainFee = msg.value / spokeChains.length;

            //Iterate over every spoke chain
            for (uint16 i = 0; i < spokeChains.length; i++) {
                // using "0" as the function selector for destination contract
                bytes memory payload = abi.encode(
                    0,
                    abi.encode(campaignID, block.timestamp)
                );

                emit CampaignCreatedPayload(payload);
                // Send a cross-chain message with axelar to the chain in the iterator
                gasService.payNativeGasForContractCall{value: crossChainFee}(
                    address(this), //sender
                    spokeChainNames[i], //destination chain
                    //address(this).toString(), //destination contract address, would be same address with address(this) since we are using constant address deployer
                    _campaignSatelliteAddr.toString(),
                    payload,
                    msg.sender //refund address //payable(address(this)) //test this later to see the one that is necessary to suit your needs
                );

                gateway.callContract(
                    spokeChainNames[i],
                    //address(this).toString(),
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

    function getAllCampaignAddresses()
        public
        view
        returns (address[] memory _campaigns)
    {
        _campaigns = new address[](campaignIdCounter);
        for (uint i = 1; i < campaignIdCounter; i++) {
            _campaigns[i] = address(allCampaigns[i]);
        }
        return _campaigns;
    }

    function getAllCampaigns()
        public
        view
        returns (Campaign[] memory _allCampaigns)
    {
        _allCampaigns = allCampaigns;
    }

    function getAllCampaignIds()
        public
        view
        returns (uint256[] memory _allCampaignIds)
    {
        _allCampaignIds = allCampaignIds;
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
                campaignIdToChainIdToSpokeCampaignData[_campaignId][
                    spokeChains[i]
                ].initialized;
        }

        collectionFinished[_campaignId] = phaseFinished; //this sets the collection of the proposalId on all chains as finished
    }

    function requestCollections(
        uint256 _campaignId,
        address _satelliteAddr
    ) public payable {
        require(
            !collectionStarted[_campaignId],
            "Collection phase for this proposal has already started"
        );

        collectionStarted[_campaignId] = true;

        //sends an empty message to each of the aggregators. If they receive a
        // message at all, it is their cue to send data back
        uint256 crossChainFee = msg.value / spokeChains.length;
        for (uint16 i = 0; i < spokeChains.length; i++) {
            // using "1" as the function selector
            bytes memory payload = abi.encode(uint16(1), _campaignId);
            gasService.payNativeGasForContractCall{value: crossChainFee}(
                address(this), //sender
                spokeChainNames[i], //destination chain
                //address(this).toString(), //destination contract address, would be same address with address(this) since we are using constant address deployer
                _satelliteAddr.toString(),
                payload,
                msg.sender //refund address //payable(address(this)) //test this later to see the one that is necessary to suit your needs
            );

            gateway.callContract(
                spokeChainNames[i],
                //address(this).toString(),
                _satelliteAddr.toString(),
                payload
            );
        }
    }

    function _execute(
        string calldata sourceChain,
        string calldata /*sourceAddress*/,
        bytes memory _payload
    ) internal override /*(AxelarExecutable)*/ {
        // Gets a function selector option

        //The code below loads a uint16 value from the memory location specified by the
        // _payload parameter and assigns it to the option variable. The assumption
        // here is that the _payload parameter points to a location in memory where a uint16
        // v(alue has been previously encoded.
        uint32 _srcChainId = spokeChainNameToSpokeChainId[sourceChain];
        uint16 option;
        assembly {
            option := mload(add(_payload, 32))
        }

        // Some options for cross-chain actions are: propose, vote, vote with reason,
        // vote with reason and params, cancel, etc.
        if (option == 0) {
            onReceiveSpokeDonationData(_srcChainId, _payload);
        } else if (option == 1) {
            // TODO: Feel free to put your own cross-chain actions (propose, execute, etc.)
            enableWithdrawal();
        } else {
            // TODO: You could revert here if you wanted to
        }
        //string memory message = abi.decode(_payload, (string));
    }

    function enableWithdrawal() public {}

    function crossChainDonate(
        uint256 _campaignId,
        uint256 _amount,
        address payable _recipient
    ) public payable virtual {
        require(
            address(idToCampaigns[_campaignId]) != address(0),
            "not a valid campaign"
        );
        require(
            msg.value > _amount,
            "sent amount is lower than amount you want to donate"
        );
        _recipient.transfer(msg.value);
    }

    function onReceiveSpokeDonationData(
        uint32 _srcChainId,
        bytes memory payload
    ) internal virtual {
        (
            ,
            //uint16 option
            uint256 campaignId,
            address campaignOwner,
            uint256 raisedFunds,
            bool hasReachedTarget,
            address[] memory donators
        ) = abi.decode(
                payload,
                (uint16, uint256, address, uint256, bool, address[])
            );

        //as long as the received data isn't already initialized.._execute
        if (
            campaignIdToChainIdToSpokeCampaignData[campaignId][_srcChainId]
                .initialized
        ) {
            revert("Already initialized");
        } else {
            //Add it to the map (while setting initialized to true)
            campaignIdToChainIdToSpokeCampaignData[campaignId][
                _srcChainId
            ] = SpokeCampaignData(
                campaignOwner,
                campaignId,
                raisedFunds,
                hasReachedTarget,
                donators,
                true
            );
        }
    }

    // function getCampaignDetails() public view returns(string[] memory)
    // {}

    // function getCampaignDetails(
    //     address[] calldata _campaignList
    // )
    //     public
    //     view
    //     returns (
    //         string[] memory campaignCID,
    //         address[] memory owner,
    //         uint256[] memory id,
    //         uint256[] memory raisedFunds
    //     )
    // {
    //     owner = new address[](_campaignList.length);
    //     id = new uint256[](_campaignList.length);
    //     campaignCID = new string[](_campaignList.length);
    //     raisedFunds = new uint256[](_campaignList.length);

    //     for (uint256 i = 0; i < _campaignList.length; i++) {
    //         //uint256 campaignID = allCampaignIds[_campaignList[i]];

    //         owner[i] = allCampaigns[campaignID].owner();
    //         id[i] = allCampaigns[campaignID].id();
    //         campaignCID[i] = allCampaigns[campaignID].campaignCID();
    //         raisedFunds[i] = allCampaigns[campaignID].raisedFunds();
    //     }

    //     return (campaignCID, owner, id, raisedFunds);
    // }

    // function getAllDonators() {

    // }
}
