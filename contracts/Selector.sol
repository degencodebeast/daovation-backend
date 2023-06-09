// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

library Selector {
    error InvalidSelector();

    bytes4 internal constant SEND_RESULTS_SELECTOR =
        bytes4(keccak256("sendResultsToHub(string, bytes)")); //1 - requestCollection
    bytes4 internal constant SET_PROPOSAL_SELECTOR =
        bytes4(keccak256("setProposalOnRemote(bytes)")); //0 - crossChainPropose
    bytes4 internal constant ON_RECEIVE_VOTING_DATA_SELECTOR =
        bytes4(keccak256("onReceiveSpokeVotingData(uint32, bytes)")); // - onReceiveSpokeVotingData
    bytes4 internal constant REMOTE_EXECUTE_PROPOSAL_SELECTOR =
        bytes4(keccak256("executeProposal(uint256)"));

    function getSelector(bytes memory _data) internal pure returns (bytes4 sig) {
        assembly {
            sig := mload(add(_data, 32))
        }
    }
}
