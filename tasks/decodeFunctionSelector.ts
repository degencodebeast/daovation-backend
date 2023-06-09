// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// contract CrossChainSender {
//     bytes4 private constant FUNCTION_SELECTOR = bytes4(keccak256("myFunction(uint256)"));

//     function preparePayload(uint256 value, address recipient) external view returns (bytes memory) {
//         bytes memory payload = abi.encode(FUNCTION_SELECTOR, value, recipient);
//         // Add additional arguments to the payload using abi.encode
//         // ...

//         return payload;
//     }
// }


// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// contract CrossChainReceiver {
//     bytes4 private constant FUNCTION_SELECTOR = bytes4(keccak256("myFunction(uint256)"));

//     function receivePayload(bytes memory payload) external {
//         bytes4 selector;
//         uint256 value;
//         address recipient;

//         assembly {
//             // Extract the function selector from the payload
//             selector := mload(add(payload, 32))
//         }

//         require(selector == FUNCTION_SELECTOR, "Invalid function selector");

//         // Decode the remaining arguments from the payload
//         (value, recipient) = abi.decode(payload[4:], (uint256, address));

//         // Process the decoded values
//         // ...
//     }
// }
