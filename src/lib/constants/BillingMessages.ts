import chalk from 'chalk'
import { COLORS } from '../../api/constants/Colors'

export const BillingMessages = {
  APP_STORE_TERMS_OF_SERVICE: chalk.hex(COLORS.WHITE).bold('App Terms of Service'),
  FREE_APP: chalk.hex(COLORS.WHITE)('Free app'),
  NA: chalk.hex(COLORS.WHITE).italic('N/A'),
  SUBSCRIPTION_MONTHLY: 'Subscription',
  CHARGED_COLUMN: chalk.hex(COLORS.WHITE).bold('What is being charged'),
  PRICING_COLUMN: chalk.hex(COLORS.WHITE).bold('Pricing (monthly)'),
  INSTALL_STARTED: 'Starting to install app with accepted Terms',
  INSTALL_SUCCESS: 'Installed after accepted terms',
  app: (app: string) => chalk.hex(COLORS.PINK)(app),
  billingOptionsForApp: (app: string) =>
    chalk.bold(`${chalk.hex(COLORS.WHITE)('Billing Options for app ')}${BillingMessages.app(app)}`),
  licenseLink: (url: string) => chalk.underline(url),
  price: (amount: number, currency: string) => `${amount} (${currency})`,
  pricePerUnit: (amount: number, currency = 'BRL') => `${BillingMessages.price(amount, currency)} per unit`,
  forUnitsOrMore: (units: number) => ` - for ${units} or more units`,
  acceptToInstallFree: (app: string) =>
    `${BillingMessages.app(app)} is a free app! Accept the app's terms to install it.`,
  acceptToInstallPaid: (app: string) =>
    `Here are some details about the pricing of ${BillingMessages.app(
      app
    )} app . To install it, you need to accept the app's terms.`,
  billingTable: (table: string) => `\n${table}`,
  shouldOpenPage: () => `Would you like to open the VTEX App Store page?`,
  getAppForInstall: (link: string) =>
    `To install this app, you first need to get it from VTEX App Store at the following link: ${link}`,
}
