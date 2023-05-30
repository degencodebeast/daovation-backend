import {
    AxelarQueryAPI,
    Environment,
    EvmChain,
    GasToken,
  } from "@axelar-network/axelarjs-sdk";

export async function getGasFee(sourceChain: string, destinationChain: string, sourceChainGasTokenSymbol: string) {
      const api = new AxelarQueryAPI({ environment: Environment.TESTNET });

      // Calculate how much gas to pay to Axelar to execute the transaction at the destination chain
      let result = api.estimateGasFee(
        sourceChain,
        destinationChain,
        sourceChainGasTokenSymbol,
        1000000,
        2
      );
      
    result.then((gasFee) => {
      // Handle the result of the promise here
      //console.log(`Gas Fee: from ${sourceChain} to ${destinationChain} is ${gasFee}`);
      return gasFee;
    }).catch((error) => {
      // Handle any errors that occurred during the promise execution
      console.error("Error:", error);
    });

    return result;

}

  


// export async function getGasFee(sourcechainName: string, destinationChainName: string, sourceChainGasTokenSymbol: string, _environment: Environment ) {
    
// const api = new AxelarQueryAPI({ environment: _environment });

// // Calculate how much gas to pay to Axelar to execute the transaction at the destination chain
// const  gasFee = await api.estimateGasFee(
//     sourcechainName,
//     destinationChainName,
//     sourceChainGasTokenSymbol,
//     1000000,
//     2
// );

// console.log(gasFee)
// return gasFee;

// }

// function hello() {
//     return "hello world"
// }

// getGasFee(EvmChain.POLYGON, EvmChain.BINANCE, GasToken.MATIC, Environment.DEVNET).catch((error) => {
//     console.error(error);
//     process.exitCode = 1;
//   });
  
//console.log(hello())