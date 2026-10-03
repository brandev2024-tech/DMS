import { router } from "expo-router";

/** Close the login/register modals and return to where the shopper was. */
export function leaveAuth() {
  if (router.canDismiss()) router.dismissAll();
  else if (router.canGoBack()) router.back();
  else router.replace("/");
}
