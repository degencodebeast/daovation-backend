//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

abstract contract CampaignCountingSimple {
    enum CampaignStatus {
        Finished,
        Ongoing
    }

    // The spokechain IDs that the Campaign manager expects to receive data from during the
    // collection phase
    uint32[] public spokeChains;

    string[] public spokeChainNames;

    constructor(
        bytes memory _spokeChainsIdData,
        bytes memory _spokeChainNamesData
    ) {
        uint32[] memory _spokeChains = abi.decode(
            _spokeChainsIdData,
            (uint32[])
        );
        string[] memory _spokeChainNames = abi.decode(
            _spokeChainNamesData,
            (string[])
        );
        setSpokeChainData(_spokeChains, _spokeChainNames);
        spokeChains = _spokeChains;
        spokeChainNames = _spokeChainNames;
    }

    struct spokeChainData {
        uint32 spokeChainId;
        string spokeChainName;
    }

    struct SpokeCampaignData {
        //string campaignCID;
        address campaignOwner;
        uint256 campaignId;
        uint256 raisedFunds;
        bool hasReachedTarget; //This checks whether data was received from the spoke chains or not
        address[] donators;
        bool initialized;
    }

    struct CampaignData {
        //string campaignCID;
        address campaignOwner;
        uint256 campaignId;
        uint256 raisedFunds;
        bool hasReachedTarget;
        address[] donators;
    }

    mapping(string => uint32) public spokeChainNameToSpokeChainId;

    // Maps a proposal ID to a map of a chain ID to summarized spoke voting data
    mapping(uint256 => mapping(uint32 => SpokeCampaignData))
        public campaignIdToChainIdToSpokeCampaignData;
    // ...

    mapping(uint256 => CampaignData) private _campaignData;

    function setSpokeChainData(
        uint32[] memory _spokeChains,
        string[] memory _spokeChainNames
    ) internal {
        require(
            _spokeChains.length == _spokeChainNames.length,
            "not equal lengths"
        );
        for (uint16 i = 0; i < _spokeChains.length; i++) {
            spokeChainNameToSpokeChainId[_spokeChainNames[i]] = _spokeChains[i];
        }
    }

    function _targetReached() internal view virtual {}

    function _countDonations() internal virtual {}
}
