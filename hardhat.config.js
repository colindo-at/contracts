require("@nomiclabs/hardhat-waffle");
require('solidity-coverage');

module.exports = {
    solidity: {
        version: "0.8.1",
        evmVersion: "Constantinople",
        settings: {
            optimizer: {
                enabled: true,
                runs: 2000,
            }
        },
    },
    networks: {
    }
};
