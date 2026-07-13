import { View, Text, Pressable } from "react-native";
import { Check } from "lucide-react-native";
import { RecallSavedContentIcon } from "../RecallSavedContentIcon";
import {
  BLACK,
  WHITE,
  GREY_LIGHT,
  GREY_MID,
  GREY_TEXT,
  GREEN,
} from "../../constants/addScreen";

export function CollectionPicker({
  collections,
  selectedCollections,
  onToggleCollection,
  onShowNewCollection,
}) {
  const availableCollections = collections ?? [];

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {availableCollections.map((col) => {
          const selected = selectedCollections.includes(col.id);
          return (
            <Pressable
              key={col.id}
              onPress={() => onToggleCollection(col.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 32,
                backgroundColor: selected ? BLACK : pressed ? "#E8E8E8" : WHITE,
                borderWidth: selected ? 0 : 1.5,
                borderColor: GREY_LIGHT,
                shadowColor: selected ? "#000" : "transparent",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selected ? 0.1 : 0,
                shadowRadius: 6,
                elevation: selected ? 2 : 0,
              })}
            >
              <Text style={{ fontSize: 13 }}>{col.emoji}</Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: selected
                    ? "Inter_600SemiBold"
                    : "Inter_400Regular",
                  color: selected ? WHITE : BLACK,
                }}
              >
                {col.name}
              </Text>
              {selected && <Check size={12} color={WHITE} strokeWidth={3} />}
            </Pressable>
          );
        })}

        {/* New Collection dashed pill */}
        <Pressable
          onPress={onShowNewCollection}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 32,
            backgroundColor: pressed ? "#E8E8E8" : GREY_LIGHT,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: GREY_MID,
          })}
        >
          <RecallSavedContentIcon name="folder-plus" size={13} />
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            New Collection
          </Text>
        </Pressable>
      </View>

      {selectedCollections.length > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingTop: 4,
          }}
        >
          <Check size={12} color={GREEN} strokeWidth={2.5} />
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: GREY_TEXT,
            }}
          >
            Adding to {selectedCollections.length} collection
            {selectedCollections.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}
    </View>
  );
}
