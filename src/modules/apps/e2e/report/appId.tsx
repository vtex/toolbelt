import * as React from 'react'
import { Box, Color } from 'ink'
import { parseAppId } from '@vtex/api'


interface AppIdProps {
    appId: string
  }
  
  export const AppId: React.FunctionComponent<AppIdProps> = ({ appId }) => {
    const { name, version, build } = parseAppId(appId)
    const [vendor, app] = name.split('.')
    return (
      <Box>
        <Color blue>{vendor}</Color>
        <Color dim>.</Color>
        {`${app}@${version}`}
        {build && <Color dim>{`+${build}`}</Color>}
      </Box>
    )
  }