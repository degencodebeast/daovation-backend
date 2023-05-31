// function triggerMessageToChildViaAxelar(bytes32 _treeId, uint256[] calldata fees) internal {
//     bytes memory rootHash = abi.encodePacked(trees[_treeId].root);        

//     //Sends root to Near Aurora
//     sendMessageToChildViaAxelar("aurora", nearMASP, rootHash, fees[4]);

//     //Sends root to BSC testnet
//     sendMessageToChildViaAxelar("binance", bscMASP, rootHash, fees[2]);

// }

// function sendMessageToChildViaAxelar(string memory networkDestination, address MASP, bytes memory rootHash, uint256 fee) internal {
//     axelarGasService.payNativeGasForContractCall{value: fee} (
//         address(this), 
//         networkDestination, 
//         MASP.toString(), 
//         rootHash, 
//         msg.sender
//     );
//     gateway.callContract(networkDestination, MASP.toString(), rootHash);
// }