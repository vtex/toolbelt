import chalk from 'chalk'
import { COLORS } from '../../api'

export const BillingMessages = {
  APP_STORE_TERMS_OF_SERVICE: chalk.hex(COLORS.YELLOW).bold('App Terms of Service: '),
  BILLING_OPTIONS: chalk.hex(COLORS.AQUA).bold('Billing Options'),
  FREE_APP: chalk.hex(COLORS.GREEN)('Free app'),
  SUBSCRIPTION_MONTHLY: 'Subscription (monthly)',
  BILLABLE_ITEM: chalk.bold('Billable item'),
  PRICING: chalk.bold('Pricing'),
  INSTALL_STARTED: 'Starting to install app with accepted Terms',
  INSTALL_SUCCESS: 'Installed after accepted terms',
  licenseLink: (url: string) => chalk.underline(url),
  price: (amount: number, currency: string) => `${amount} (${currency})`,
  pricePerUnit: (amount: number, currency = 'BRL') => `${BillingMessages.price(amount, currency)} per unit`,
  forUnitsOrMore: (units: number) => ` - for ${units} or more units`,
  acceptToInstall: (app: string, free: boolean, terms: string) =>
    `${chalk.hex(COLORS.BLUE)(app)} is a ${
      free ? chalk.hex(COLORS.GREEN)('free') : chalk.hex(COLORS.MAGENTA)('paid')
    } app. To install it, you need to accept the following Terms:\n\n${terms}\n`,
}
