import chalk from 'chalk'
import { COLORS } from '../../api/constants/Colors'

export const BillingMessages = {
  app: (app: string) => chalk.hex(COLORS.PINK)(app),
  shouldOpenPage: () => `Would you like to open the VTEX App Store page?`,
  getAppForInstall: (link: string) =>
    `To install this app, you first need to get it from VTEX App Store at the following link: ${link}`,
  accountNotSponsoredByVendorError: (app: string) =>
    `Cannot install app '${app}' because it has billingOptions with type 'sponsored' but this account is not sponsored by the app's vendor.`,
}
