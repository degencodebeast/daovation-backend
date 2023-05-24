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

    string public chainName;

    string public hubChain;

    //mapping(uint256 => RemoteCampaign) public campaigns;
    mapping(uint256 => CampaignData) public campaigns;

    //mapping to store all campaigns on this chain
    mapping(uint256 => RemoteCampaign) public remoteCampaignsData;

    //campaign data
    struct CampaignData {
        //string campaignCID;
        address campaignOwner;
        uint256 campaignId;
        uint256 raisedFunds;
        bool hasReachedTarget;
        address[] donators;
    }

    enum CampaignStatus {
        Finished,
        Ongoing
    }

    //remote campaigns
    struct RemoteCampaign {
        //Blocks provided by the hub chain as to when the local values should start/finish
        uint256 timeCampaignStarted;
        bool campaignFinished;
    }

    constructor(
        string memory _hubChain,
        address _gateway,
        address _gasService
    ) payable AxelarExecutable(_gateway) {
        gasService = IAxelarGasService(_gasService);
        hubChain = _hubChain;
    }

    //checks whether a campaign exists in the contract by checking if the localVoteStart variable of the corresponding
    //campaign in the campaigns mapping has been set to a non-zero value.
    function isCampaign(uint256 _campaignId) public view returns (bool) {
        return remoteCampaignsData[_campaignId].timeCampaignStarted != 0;
    }

    function _execute(
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes memory _payload
    ) internal override {
        require(
            keccak256(abi.encodePacked(sourceChain)) ==
                keccak256(abi.encodePacked(hubChain)),
            "Only messages from the hub chain can be received!"
        );

        uint16 option;
        assembly {
            option := mload(add(_payload, 32))
        }
        // Do 1 of 2 things:
        //Begin proposal on the chain, with local block times
        if (option == 0) {
            //To do this, decode the payload, which includes a proposal ID and the timestamp of when the proposal was made as mentioned in the CrossChainDAO section
            //Perform some calculations to generate a cutOffBlockEstimation by subtracting blocks from the current block based on
            //the timestamp and a predetermined seconds-per-block estimate
            // Add a RemoteProposal struct to the proposals map, effectively registering the proposal and its voting-related data on the spoke chain
            (, uint256 _campaignId, uint256 campaignStart) = abi.decode(
                _payload,
                (uint16, uint256, uint256)
            );
            require(
                !isCampaign(_campaignId),
                "Proposal ID must be unique, and not already set"
            );

            remoteCampaignsData[_campaignId] = RemoteCampaign(
                campaignStart,
                false
            );
        } else if (option == 1) {
            //send campaign results back to the hub chain
            (, uint256 _campaignId) = abi.decode(_payload, (uint16, uint256));
            CampaignData storage campaign = campaigns[_campaignId];
            bytes memory campaignDataPayload = abi.encode(
                uint16(0),
                _campaignId,
                campaign.campaignOwner,
                campaign.raisedFunds,
                campaign.hasReachedTarget,
                campaign.donators
            );

            gasService.payNativeGasForContractCall{value: 0.1 ether}(
                address(this), //sender
                hubChain, //destination chain
                //address(this).toString(), //destination contract address, would be same address with address(this) since we are using constant address deployer
                sourceAddress,
                campaignDataPayload, //payload
                msg.sender //refund address //payable(address(this)) //test this later to see the one that is necessary to suit your needs
            );

            gateway.callContract(
                hubChain, //destination chain
                //address(this).toString(), //destination contract address, would be same address with address(this) since we are using constant address deployer, if not using constant deployer then will be "hubChainAddr"
                sourceAddress,
                campaignDataPayload //payload
            );
            campaigns[_campaignId].hasReachedTarget = true;
            remoteCampaignsData[_campaignId].campaignFinished = true;
        }
    }

    function sourceChainDonate(
        uint256 _campaignId,
        uint256 _amount,
        address payable _depositAddress
    ) public payable virtual {
        RemoteCampaign storage campaign = remoteCampaignsData[_campaignId];
        require(!campaign.campaignFinished, "campaign has been completed");
        require(isCampaign(_campaignId), "not a valid campaign");
        require(
            msg.value > _amount,
            "sent amount is lower than amount you want to donate"
        );
        _depositAddress.transfer(msg.value);
    }

    function countDonations(uint256 _campaignId) internal virtual {}

    function _setup(bytes calldata params) internal override {
        string memory chainName_ = abi.decode(params, (string));
        if (bytes(chainName).length != 0) revert AlreadyInitialized();
        chainName = chainName_;
    }

    function contractId() external pure returns (bytes32) {
        return keccak256("example");
    }
}
