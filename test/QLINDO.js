/*
 * This file is part of the artèQ Technologies contracts (https://github.com/arteq-tech/contracts).
 * Copyright (c) 2022 artèQ Technologies (https://arteq.tech)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
    ZeroAddress,
    MaxInt,
    _getApprovedAdminTask,
    _getApprovedTask,
    _getNonApprovedTask,
    _getChainTs,
    _setChainTs,
} = require("./helpers");

describe("QLINDO", function() {

  beforeEach(async () => {
    provider = waffle.provider;
    [
      deployer,
      admin1, admin2, admin3, admin4, admin5,
      creator,
      approver1, approver2, approver3,
      executor,
      finalizer,
      trader1, trader2, trader3, trader4, trader5, trader6, trader7, trader8,
    ] = await ethers.getSigners();

    const TaskManagerContract = await hre.ethers.getContractFactory("QlindoTaskManager", deployer);
    tmContract = await TaskManagerContract.deploy(
      [ admin1, admin2, admin3, admin4, admin5 ].map((s) => s.address),
      [ creator ].map((s) => s.address),
      [ approver1, approver2, approver3 ].map((s) => s.address),
      [ executor ].map((s) => s.address),
      false
    );
    await tmContract.deployed();

    const QLINDOContract = await hre.ethers.getContractFactory("QLINDO", deployer);
    await expect(QLINDOContract.deploy(ZeroAddress))
      .to.be.revertedWith("QLINDO: zero address set for task manager");
    contract = await QLINDOContract.deploy(tmContract.address);
    await contract.deployed();

    const deployReceipt = await contract.deployTransaction.wait();
    expect(deployReceipt.logs.length).to.equal(2);
    await expect(contract.deployTransaction).to.emit(contract, "TaskManagerChanged")
      .withArgs(tmContract.address);
    await expect(contract.deployTransaction).to.emit(contract, "Transfer")
      .withArgs(ZeroAddress, tmContract.address, 10 * 10 ** 9);

    expect(await contract.connect(trader1).name()).to.equal("Qlindo Realestate Investment Token");
    expect(await contract.connect(trader1).symbol()).to.equal("QLINDO");
    expect(await contract.connect(trader1).decimals()).to.equal(0);
    expect(await contract.connect(trader1).getTaskManager()).to.equal(tmContract.address);
    expect(await contract.connect(trader1).balanceOf(tmContract.address)).to.equal(10 * 10 ** 9);

    const adminTaskId = await _getApprovedAdminTask(tmContract);
    await tmContract.connect(admin1).addFinalizer(adminTaskId, contract.address);
  });

  it("[Native Transfer] should not accept ether", async () => {
    expect(await provider.getBalance(contract.address)).to.equal(0);
    await expect(trader1.sendTransaction({
      to: contract.address,
      value: ethers.utils.parseEther("1"),
    })).to.be.revertedWith("QLINDO: cannot accept ether");
    expect(await provider.getBalance(contract.address)).to.equal(0);
  });

  // ==================== BatchTransferEnabled::doBatchTransferWithLock =================

  it("[doBatchTransferWithLock] cannot be called by a non-executor account", async () => {
    const ts = await _getChainTs();
    const taskId = await _getApprovedTask(tmContract);
    await expect(contract.connect(trader1)
      .doBatchTransferWithLock(taskId, [ trader1.address ], [ 100 ], [ ts ]))
        .to.be.revertedWith("ExecutorRoleEnabled: not an executor account");
  });

  it("[doBatchTransferWithLock] task must exist", async () => {
    const ts = await _getChainTs();
    await expect(contract.connect(executor)
      .doBatchTransferWithLock(2, [ trader1.address ], [ 100 ], [ ts ]))
        .to.be.revertedWith("TaskManaged: task does not exist");
  });

  it("[doBatchTransferWithLock] task must not be administrative", async () => {
    const ts = await _getChainTs();
    const adminTaskId = await _getApprovedAdminTask(tmContract);
    await expect(contract.connect(executor)
      .doBatchTransferWithLock(adminTaskId, [ trader1.address ], [ 100 ], [ ts ]))
        .to.be.revertedWith("TaskManaged: invalid task type");
  });

  it("[doBatchTransferWithLock] task must not be finalized", async () => {
    const ts = await _getChainTs();
    const taskId = await _getApprovedTask(tmContract);
    await tmContract.connect(admin2).finalizeTask(taskId, "no reason");
    await expect(contract.connect(executor)
      .doBatchTransferWithLock(taskId, [ trader1.address ], [ 100 ], [ ts ]))
        .to.be.revertedWith("TaskManaged: task is finalized");
  });

  it("[doBatchTransferWithLock] task must be approved", async () => {
    const ts = await _getChainTs();
    const taskId = await _getNonApprovedTask(tmContract);
    await expect(contract.connect(executor)
      .doBatchTransferWithLock(taskId, [ trader1.address ], [ 100 ], [ ts ]))
        .to.be.revertedWith("TaskManaged: task is not approved");
  });

  it("[doBatchTransferWithLock] must fail when the array lengths differ", async () => {
    const ts = await _getChainTs();
    {
      const taskId = await _getApprovedTask(tmContract);
      await expect(contract.connect(executor)
        .doBatchTransferWithLock(taskId, [ trader1.address, trader2.address ], [ 100 ], [ ts ]))
          .to.be.revertedWith("BatchTransferEnabled: inputs have incorrect lengths");
    }
    {
      const taskId = await _getApprovedTask(tmContract);
      await expect(contract.connect(executor)
        .doBatchTransferWithLock(taskId, [ trader1.address ], [ 100 ], [ ts, ts + 1000 ]))
          .to.be.revertedWith("BatchTransferEnabled: inputs have incorrect lengths");
    }
    {
      const taskId = await _getApprovedTask(tmContract);
      await expect(contract.connect(executor)
        .doBatchTransferWithLock(taskId, [ trader1.address ], [ 100, 200 ], [ ts ]))
          .to.be.revertedWith("BatchTransferEnabled: inputs have incorrect lengths");
    }
  });

  it("[doBatchTransferWithLock] must fail when the arrays are empty", async () => {
    const ts = await _getChainTs();
    {
      const taskId = await _getApprovedTask(tmContract);
      await expect(contract.connect(executor)
        .doBatchTransferWithLock(taskId, [], [ 100 ], [ ts ]))
          .to.be.revertedWith("BatchTransferEnabled: inputs have incorrect lengths");
    }
    {
      const taskId = await _getApprovedTask(tmContract);
      await expect(contract.connect(executor)
        .doBatchTransferWithLock(taskId, [ trader1.address ], [], [ ts ]))
          .to.be.revertedWith("BatchTransferEnabled: inputs have incorrect lengths");
    }
    {
      const taskId = await _getApprovedTask(tmContract);
      await expect(contract.connect(executor)
        .doBatchTransferWithLock(taskId, [ trader1.address ], [ 100 ], []))
          .to.be.revertedWith("BatchTransferEnabled: inputs have incorrect lengths");
    }
    {
      const taskId = await _getApprovedTask(tmContract);
      await expect(contract.connect(executor).doBatchTransferWithLock(taskId, [], [], []))
        .to.be.revertedWith("BatchTransferEnabled: empty inputs");
    }
  });

  it("[doBatchTransferWithLock] successful call", async () => {
    const ts = await _getChainTs();
    expect(await contract.connect(trader1).balanceOf(tmContract.address)).to.equal(10 * 10 ** 9);
    expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(0);
    expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(0);
    expect(await contract.connect(trader1).balanceOf(trader3.address)).to.equal(0);
    const taskId = await _getApprovedTask(tmContract);
    const call = contract.connect(executor)
      .doBatchTransferWithLock(
        taskId,
        [
          trader1.address,
          trader2.address,
          trader3.address,
        ],
        [
          1000,
          2500,
          3400,
        ],
        [
          ts + 1000,
          ts + 2000,
          ts + 3000,
        ],
      );
    const tx = await call;
    const receipt = await tx.wait();
    expect(receipt.logs.length).to.equal(8);
    await expect(tx).to.emit(contract, "LockTsChanged")
      .withArgs(trader1.address, ts + 1000);
    await expect(tx).to.emit(contract, "LockTsChanged")
      .withArgs(trader2.address, ts + 2000);
    await expect(tx).to.emit(contract, "LockTsChanged")
      .withArgs(trader3.address, ts + 3000);
    await expect(tx).to.emit(contract, "Transfer")
      .withArgs(tmContract.address, trader1.address, 1000);
    await expect(tx).to.emit(contract, "Transfer")
      .withArgs(tmContract.address, trader2.address, 2500);
    await expect(tx).to.emit(contract, "Transfer")
      .withArgs(tmContract.address, trader3.address, 3400);
    await expect(tx).to.emit(tmContract, "TaskFinalized")
      .withArgs(taskId, "");
    await expect(tx).to.emit(tmContract, "TaskExecuted")
      .withArgs(contract.address, executor.address, taskId);
    expect(await contract.connect(trader1).balanceOf(tmContract.address))
      .to.equal(10 * 10 ** 9 - 1000 - 2500 - 3400);
    expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(1000);
    expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(2500);
    expect(await contract.connect(trader1).balanceOf(trader3.address)).to.equal(3400);
  });

  it("[doBatchTransferWithLock] must fail if one of the accounts is zero", async () => {
    const taskId = await _getApprovedTask(tmContract);
    await expect(
      contract.connect(executor)
        .doBatchTransferWithLock(
          taskId,
          [
            trader1.address,
            trader2.address,
            ZeroAddress,
          ],
          [
            1000,
            2500,
            3400,
          ],
          [
            0,
            0,
            0,
          ],
        )
    ).to.be.revertedWith("BatchTransferEnabled: target with zero address");
  });

  it("[doBatchTransferWithLock] must fail if one of the accounts is task manager", async () => {
    const taskId = await _getApprovedTask(tmContract);
    await expect(
      contract.connect(executor)
        .doBatchTransferWithLock(
          taskId,
          [
            trader1.address,
            tmContract.address,
            trader3.address,
          ],
          [
            1000,
            2500,
            3400,
          ],
          [
            0,
            0,
            0,
          ],
        )
    ).to.be.revertedWith("BatchTransferEnabled: invalid target");
  });

  it("[doBatchTransferWithLock] account must not be able to transfer when locked", async () => {
    const ts = await _getChainTs();
    const taskId = await _getApprovedTask(tmContract);
    await contract.connect(executor)
      .doBatchTransferWithLock(taskId, [ trader1.address ], [ 1000 ], [ ts + 1000 ]);
    {
      await _setChainTs(ts + 400);
      await expect(contract.connect(trader1).transfer(trader2.address, 150))
        .to.be.revertedWith("QLINDO: account cannot transfer tokens");
    }
    {
      await _setChainTs(ts + 999);
      await expect(contract.connect(trader1).transfer(trader2.address, 150))
        .to.be.revertedWith("QLINDO: account cannot transfer tokens");
    }
    {
      await _setChainTs(ts + 1001);
      expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(1000);
      expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(0);
      await contract.connect(trader1).transfer(trader2.address, 150);
      expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(850);
      expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(150);
    }
  });

  it("[doBatchTransferWithLock] setting zero lock ts does not remove lock", async () => {
    const ts = await _getChainTs();
    const taskId = await _getApprovedTask(tmContract);
    await contract.connect(executor)
      .doBatchTransferWithLock(taskId, [ trader1.address ], [ 1000 ], [ ts + 1000 ]);
    {
      await _setChainTs(ts + 400);
      await expect(contract.connect(trader1).transfer(trader2.address, 150))
        .to.be.revertedWith("QLINDO: account cannot transfer tokens");
    }
    {
      const taskId = await _getApprovedTask(tmContract);
      await contract.connect(executor)
        .doBatchTransferWithLock(taskId, [ trader1.address ], [ 0 ], [ 0 ]);
    }
    {
      await _setChainTs(ts + 999);
      await expect(contract.connect(trader1).transfer(trader2.address, 150))
        .to.be.revertedWith("QLINDO: account cannot transfer tokens");
    }
    {
      await _setChainTs(ts + 1001);
      expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(1000);
      expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(0);
      await contract.connect(trader1).transfer(trader2.address, 150);
      expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(850);
      expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(150);
    }
  });

  it("[doBatchTransferWithLock] remove lock", async () => {
    const ts = await _getChainTs();
    const taskId = await _getApprovedTask(tmContract);
    await contract.connect(executor)
      .doBatchTransferWithLock(taskId, [ trader1.address ], [ 1000 ], [ ts + 1000 ]);
    {
      await _setChainTs(ts + 400);
      await expect(contract.connect(trader1).transfer(trader2.address, 150))
        .to.be.revertedWith("QLINDO: account cannot transfer tokens");
    }
    {
      const taskId = await _getApprovedTask(tmContract);
      const call = contract.connect(executor)
        .updateLockTs(taskId, [ trader1.address ], [ 0 ]);
      const tx = await call;
      const receipt = await tx.wait();
      await expect(tx).to.emit(contract, "LockTsChanged")
        .withArgs(trader1.address, 0);
    }
    {
      expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(1000);
      expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(0);
      await contract.connect(trader1).transfer(trader2.address, 150);
      expect(await contract.connect(trader1).balanceOf(trader1.address)).to.equal(850);
      expect(await contract.connect(trader1).balanceOf(trader2.address)).to.equal(150);
    }
  });
});
