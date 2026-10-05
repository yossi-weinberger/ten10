const { execFileSync } = require("child_process");

function getCurrentBranch() {
  return execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
}

function getMainBranchError(action, branch) {
  if (branch === "main") {
    return null;
  }

  return `Refusing to ${action} from branch '${branch || "detached HEAD"}'. Switch to main first.`;
}

module.exports = {
  getCurrentBranch,
  getMainBranchError,
};
