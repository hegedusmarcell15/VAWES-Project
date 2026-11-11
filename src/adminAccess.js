const adminEmails = new Set([
  'fxadamg@vawes.app',
  'fxmarcellg@vawes.app',
  'ricsikicsikonyhaja@vawes.app',
])

export function isAllowedAdmin(user) {
  return Boolean(user?.isAdmin && adminEmails.has(user.email?.trim().toLowerCase()))
}
