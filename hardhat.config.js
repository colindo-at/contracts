require("@nomiclabs/hardhat-waffle");
// require("@nomiclabs/hardhat-vyper");
require('solidity-coverage');

module.exports = {
    solidity: {
        version: "0.8.1",
        evmVersion: "Constantinople",
        settings: {
            optimizer: {
                enabled: true,
                runs: 2000,
                details: {
                    yul: true,
                    yulDetails: {
                        stackAllocation: true,
                        optimizerSteps: "dhfoDgvulfnTUtnIf"
                    }
                }
            }
        },
    },
    vyper: {
        version: "0.1.0b14",
    },
    networks: {
        main: {
            url: "https://mainnet.infura.io/v3/4784dc2433044128b07d9a4bf480922a",
            accounts: {
                count: 1,
                mnemonic: "",
                path: "m/44'/60'/0'/0",
            },
        },
        rinkeby: {
            url: "https://rinkeby.infura.io/v3/4784dc2433044128b07d9a4bf480922a",
            accounts: {
                count: 10,
                mnemonic: "",
                path: "m/44'/60'/0'/0",
            },
        }
    }
};
