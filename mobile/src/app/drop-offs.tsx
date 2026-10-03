import { useQuery } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyState } from "@/components/ui/misc";
import { Eyebrow, Heading, Text } from "@/components/ui/text";
import { fetchDropPoints, qk } from "@/lib/api";
import { useSettings } from "@/lib/hooks";
import type { DropPoint } from "@/lib/types";

/** Opens the phone's maps app at the drop-off point. */
function openMap(p: DropPoint) {
  const label = encodeURIComponent(p.name);
  const url =
    Platform.OS === "ios"
      ? `https://maps.apple.com/?ll=${p.lat},${p.lng}&q=${label}`
      : `geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${label})`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`));
}

export default function DropOffs() {
  const settings = useSettings();
  const { data: points = [] } = useQuery({ queryKey: qk.dropPoints, queryFn: fetchDropPoints });
  const areas = [...new Set(points.map((p) => p.area))];

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="p-5 pb-10">
      <Card className="bg-blush">
        <Eyebrow>Shipping nationwide</Eyebrow>
        <Heading className="mt-1 text-2xl">{settings.couriers.join(" · ")}</Heading>
        {settings.shipping_notes ? <Text className="mt-2 text-[13px] text-muted">{settings.shipping_notes}</Text> : null}
      </Card>

      {!points.length ? (
        <EmptyState icon="location-outline" title="Drop-off points coming soon" body="Message us and we'll arrange a meet-up or ship your order." />
      ) : (
        areas.map((area) => (
          <View key={area} className="mt-8">
            <Eyebrow className="mb-3">{area}</Eyebrow>
            <View className="gap-3">
              {points
                .filter((p) => p.area === area)
                .map((p) => (
                  <Pressable key={p.id} onPress={() => openMap(p)} className="active:opacity-80">
                    <Card>
                      <View className="flex-row items-start gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-full bg-blush">
                          <Icon name={p.kind === "partner" ? "storefront-outline" : "location-outline"} size={18} color="rose-ink" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-medium">{p.name}</Text>
                          <Text className="text-[11px] uppercase tracking-[1px] text-gold-ink">{p.kind === "partner" ? "Partner shop" : "Drop-off point"}</Text>
                          {p.address ? <Text className="mt-1 text-[13px] text-muted">{p.address}</Text> : null}
                          {p.landmark ? <Text className="text-[13px] text-muted">Near {p.landmark}</Text> : null}
                          {p.schedule ? <Text className="mt-1 text-[13px]">{p.schedule}</Text> : null}
                          {p.notes ? <Text className="mt-1 text-[12px] text-muted">{p.notes}</Text> : null}
                        </View>
                        <Icon name="navigate-outline" size={18} color="muted" />
                      </View>
                    </Card>
                  </Pressable>
                ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
