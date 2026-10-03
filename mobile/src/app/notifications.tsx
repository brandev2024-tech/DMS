import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { Card, Toggle } from "@/components/ui/misc";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { isPushEnabledPref, registerForPush, unregisterPush } from "@/lib/push";

export default function NotificationSettings() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    isPushEnabledPref().then(setEnabled);
  }, []);

  const change = async (on: boolean) => {
    setEnabled(on);
    setProblem(null);
    if (on) {
      const res = await registerForPush();
      if (!res.ok) {
        setEnabled(false);
        setProblem(res.reason ?? "Couldn't turn on notifications.");
      } else toast("Notifications on 💌");
    } else {
      await unregisterPush(true);
      toast("Notifications off");
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 p-6">
      <Card>
        <Toggle
          label="Chat notifications"
          detail={isAdmin ? "New Direct Ask messages from shoppers." : "When DMS replies to your Direct Ask."}
          value={enabled}
          onChange={change}
        />
      </Card>
      {problem ? (
        <Card className="gap-3">
          <Text className="text-[13px] text-muted">{problem}</Text>
          <Button title="Open phone settings" variant="outline" small onPress={() => Linking.openSettings()} />
        </Card>
      ) : null}
      <Text className="text-[12px] text-muted">Notifications are only sent for your own chats. You can change this any time.</Text>
    </ScrollView>
  );
}
