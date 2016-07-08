export function getDevWorkspace (email) {
  return `sb_${email}`
}

export function getWorkspaceURL (account, email) {
  return `http://${account}.beta.myvtex.com/?workspace=${getDevWorkspace(email)}`
}
