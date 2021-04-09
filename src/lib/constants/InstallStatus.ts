export enum InstallStatus {
  ACCEPTED_TERMS = 'installed_by_accepted_terms',
  ALREADY_PURCHASED = 'already_purchased',
  CHECK_TERMS = 'check_terms',
  FREE = 'installed_free',
  OWN_APP = 'own_app',
  OWN_REGISTRY = 'installed_from_own_registry',
  PREVIOUS_PURCHASE = 'installed_by_previous_purchase',
  PUBLIC_REGISTRY = 'public_app',
  USER_HAS_NO_BUY_APP_LICENSE = 'no_buy_app_license',
  USER_HAS_NO_INSTALL_APP_LICENSE = 'no_install_app_license',
  AREA_UNAVAILABLE = 'area_unavailable',
  CONTRACT_NOT_FOUND = 'contract_not_found',
}
