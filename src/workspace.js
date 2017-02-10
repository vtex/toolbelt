export function getWorkspaceURL (account, workspace) {
  const env = process.env.VTEX_ENV === 'beta' ? '.beta' : ''
  return `http://${account}${env}.myvtex.com/?workspace=${workspace}`
}
