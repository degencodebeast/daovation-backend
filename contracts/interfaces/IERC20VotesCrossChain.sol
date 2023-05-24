// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import { IVotes } from '@openzeppelin/contracts/governance/utils/IVotes.sol';
import { IERC20 } from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IERC20.sol';
import {IERC20Permit} from '@axelar-network/axelar-cgp-solidity/contracts/interfaces/IERC20Permit.sol';

interface IERC20VotesCrossChain is IERC20, IVotes, IERC20Permit {
   
    struct Checkpoint {
        uint32 fromBlock;
        uint224 votes;
    }

    function numCheckpoints(address account) external view returns (uint32); 

    function checkpoints(address account, uint32 pos) external view returns (Checkpoint memory);

     function transferRemote(
        string calldata destinationChain,
        address destinationAddress,
        uint256 amount
    ) external payable;



}