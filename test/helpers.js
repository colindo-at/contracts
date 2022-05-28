const ZeroAddress = "0x0000000000000000000000000000000000000000";
const MaxInt = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

const _getApprovedAdminTask = async (tmContract) => {
  let theContract = contract;
  if (tmContract) {
    theContract = tmContract;
  }
  const tx = await theContract.connect(admin1).createAdminTask("https://details");
  const receipt = await tx.wait();
  const taskId = receipt.events[0].args['taskId'].toNumber();
  const nrOfAdmins = await theContract.connect(admin1).getNrAdmins();
  await theContract.connect(admin1).approveAdminTask(taskId);
  await theContract.connect(admin2).approveAdminTask(taskId);
  await theContract.connect(admin3).approveAdminTask(taskId);
  if (nrOfAdmins > 5) {
    await theContract.connect(admin4).approveAdminTask(taskId);
  }
  if (nrOfAdmins > 7) {
    await theContract.connect(trader1).approveAdminTask(taskId);
  }
  if (nrOfAdmins > 9) {
    await theContract.connect(trader2).approveAdminTask(taskId);
  }
  return taskId;
};

const _getNonApprovedAdminTask = async (tmContract) => {
  let theContract = contract;
  if (tmContract) {
    theContract = tmContract;
  }
  const tx = await theContract.connect(admin1).createAdminTask("https://details");
  const receipt = await tx.wait();
  const taskId = receipt.events[0].args['taskId'].toNumber();
  const nrOfAdmins = await theContract.connect(admin1).getNrAdmins();
  await theContract.connect(admin1).approveAdminTask(taskId);
  await theContract.connect(admin2).approveAdminTask(taskId);
  return taskId;
};

const _getApprovedTask = async (tmContract) => {
  let theContract = contract;
  if (tmContract) {
    theContract = tmContract;
  }
  const tx = await theContract.connect(creator).createTask("https://details");
  const receipt = await tx.wait();
  const taskId = receipt.events[0].args['taskId'].toNumber();
  await theContract.connect(approver1).approveTask(taskId);
  await theContract.connect(approver2).approveTask(taskId);
  return taskId;
};

const _getNonApprovedTask = async (tmContract) => {
  let theContract = contract;
  if (tmContract) {
    theContract = tmContract;
  }
  const tx = await theContract.connect(creator).createTask("https://details");
  const receipt = await tx.wait();
  const taskId = receipt.events[0].args['taskId'].toNumber();
  await theContract.connect(approver1).approveTask(taskId);
  return taskId;
};

const _getChainTs = async () => {
  const latestBlock = await hre.ethers.provider.getBlock("latest")
  return latestBlock.timestamp;
}

const _setChainTs = async (ts) => {
  await ethers.provider.send("evm_setNextBlockTimestamp", [ ts ]);
  await ethers.provider.send("evm_mine");
}

module.exports = {
  ZeroAddress,
  MaxInt,
  _getApprovedAdminTask,
  _getNonApprovedAdminTask,
  _getApprovedTask,
  _getNonApprovedTask,
  _setChainTs,
  _getChainTs,
};
