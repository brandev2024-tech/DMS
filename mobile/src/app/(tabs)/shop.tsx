import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProductCard } from "@/components/product";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Chip, EmptyState } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { GridSkeleton } from "@/components/ui/skeleton";
import { Heading, Text } from "@/components/ui/text";
import { fetchFacets, fetchShopPage, PAGE_SIZE, qk, type ShopFilters } from "@/lib/api";
import { useCategories, useSettings } from "@/lib/hooks";
import { useColors } from "@/lib/theme";

const SORTS: { key: NonNullable<ShopFilters["sort"]>; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];
const AVAILABILITY: { key: NonNullable<ShopFilters["availability"]>; label: string }[] = [
  { key: "available", label: "Available" },
  { key: "few_left", label: "Few Left" },
  { key: "sold_out", label: "Sold Out" },
];

type Extra = Pick<ShopFilters, "size" | "color" | "availability" | "minPrice" | "maxPrice" | "sort">;

export default function Shop() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const params = useLocalSearchParams<{ category?: string; focus?: string }>();
  const settings = useSettings();
  const { data: categories = [] } = useCategories();
  const { data: facets } = useQuery({ queryKey: qk.facets, queryFn: fetchFacets, staleTime: 5 * 60_000 });

  const [categorySlug, setCategorySlug] = useState<string | null>(params.category ?? null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [extra, setExtra] = useState<Extra>({ sort: "newest" });
  const [draft, setDraft] = useState<Extra>(extra);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<TextInput>(null);

  // Deep links / home tiles: /shop?category=<slug> (adjusts state while rendering, per React docs).
  const [seenParam, setSeenParam] = useState(params.category);
  if (params.category !== seenParam) {
    setSeenParam(params.category);
    if (params.category !== undefined) setCategorySlug(params.category || null);
  }
  useEffect(() => {
    if (params.focus === "search") setTimeout(() => searchRef.current?.focus(), 300);
  }, [params.focus]);
  // Debounce typing.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 350);
    return () => clearTimeout(t);
  }, [searchText]);

  const categoryId = categories.find((x) => x.slug === categorySlug)?.id ?? null;
  const filters: ShopFilters = useMemo(() => ({ ...extra, categoryId, search }), [extra, categoryId, search]);
  const waitingForCategory = Boolean(categorySlug) && !categoryId && !categories.length;

  const query = useInfiniteQuery({
    queryKey: qk.shop(filters),
    enabled: !waitingForCategory,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchShopPage(filters, pageParam),
    getNextPageParam: (last, all) => (last.length < PAGE_SIZE ? undefined : all.length),
  });
  const products = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const activeCount = [extra.size, extra.color, extra.availability, extra.minPrice, extra.maxPrice].filter((v) => v != null && v !== "").length;

  const header = (
    <View style={{ paddingTop: insets.top + 8 }} className="bg-bg pb-2">
      <View className="flex-row items-center justify-between px-5">
        <Heading>Shop</Heading>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setDraft(extra);
            setFiltersOpen(true);
          }}
          className="flex-row items-center gap-1.5 rounded-full border border-line px-4 py-2 active:opacity-70"
        >
          <Icon name="options-outline" size={16} />
          <Text className="text-[13px]">Filter{activeCount ? ` · ${activeCount}` : ""}</Text>
        </Pressable>
      </View>
      <View className="mx-5 mt-3 h-11 flex-row items-center gap-2 rounded-full border border-line bg-surface px-4">
        <Icon name="search-outline" size={18} color="muted" />
        <TextInput
          ref={searchRef}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search jackets, colours, materials…"
          placeholderTextColor={c.muted}
          returnKeyType="search"
          className="flex-1 font-sans text-[15px] text-ink"
        />
        {searchText ? (
          <Pressable accessibilityLabel="Clear search" onPress={() => setSearchText("")} hitSlop={8}>
            <Icon name="close-circle" size={18} color="muted" />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 pt-3">
        <Chip label="All" active={!categorySlug} onPress={() => setCategorySlug(null)} />
        {categories.map((cat) => (
          <Chip key={cat.id} label={cat.name} active={categorySlug === cat.slug} onPress={() => setCategorySlug(cat.slug)} />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      {header}
      {query.isPending ? (
        <GridSkeleton />
      ) : (
        <FlashList
          data={products}
          numColumns={2}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 24 }}
          renderItem={({ item }) => <ProductCard product={item} money={settings} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
          refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={c.rose} colors={[c.rose]} />}
          ListEmptyComponent={
            <EmptyState icon="sparkles-outline" title="Nothing here yet" body={query.isError ? "Couldn't load products. Pull to try again." : "Try another category or clear your filters."}>
              {activeCount || search ? (
                <Button
                  title="Clear filters"
                  variant="outline"
                  small
                  onPress={() => {
                    setExtra({ sort: "newest" });
                    setSearchText("");
                  }}
                />
              ) : null}
            </EmptyState>
          }
          ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator className="py-6" color={c.rose} /> : null}
        />
      )}

      <Sheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter & sort"
        footer={
          <View className="flex-row gap-3">
            <Button title="Reset" variant="outline" className="flex-1" onPress={() => setDraft({ sort: "newest" })} />
            <Button
              title="Show results"
              className="flex-[2]"
              onPress={() => {
                setExtra(draft);
                setFiltersOpen(false);
              }}
            />
          </View>
        }
      >
        <FilterGroup title="Sort by">
          {SORTS.map((s) => (
            <Chip key={s.key} label={s.label} active={(draft.sort ?? "newest") === s.key} onPress={() => setDraft({ ...draft, sort: s.key })} />
          ))}
        </FilterGroup>
        {facets?.sizes.length ? (
          <FilterGroup title="Size">
            {facets.sizes.map((s) => (
              <Chip key={s} label={s} active={draft.size === s} onPress={() => setDraft({ ...draft, size: draft.size === s ? null : s })} />
            ))}
          </FilterGroup>
        ) : null}
        {facets?.colors.length ? (
          <FilterGroup title="Color">
            {facets.colors.map((s) => (
              <Chip key={s} label={s} active={draft.color === s} onPress={() => setDraft({ ...draft, color: draft.color === s ? null : s })} />
            ))}
          </FilterGroup>
        ) : null}
        <FilterGroup title="Availability">
          {AVAILABILITY.map((a) => (
            <Chip
              key={a.key}
              label={a.label}
              active={draft.availability === a.key}
              onPress={() => setDraft({ ...draft, availability: draft.availability === a.key ? null : a.key })}
            />
          ))}
        </FilterGroup>
        <Text className="mb-2 mt-5 font-medium text-[13px] text-muted">Price range ({settings.currency_symbol})</Text>
        <View className="flex-row gap-3">
          <Input
            className="flex-1"
            placeholder="Min"
            keyboardType="number-pad"
            value={draft.minPrice != null ? String(draft.minPrice) : ""}
            onChangeText={(t) => setDraft({ ...draft, minPrice: t ? Number(t.replace(/\D/g, "")) : null })}
          />
          <Input
            className="flex-1"
            placeholder="Max"
            keyboardType="number-pad"
            value={draft.maxPrice != null ? String(draft.maxPrice) : ""}
            onChangeText={(t) => setDraft({ ...draft, maxPrice: t ? Number(t.replace(/\D/g, "")) : null })}
          />
        </View>
        <Text className="mt-2 text-[12px] text-muted">Price filters only include pieces with a listed price.</Text>
      </Sheet>
    </View>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <Text className="mb-2 font-medium text-[13px] text-muted">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}
