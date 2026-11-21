import { Text } from "react-native";
import type { Notice } from "../../api/reali";
import { stamp, ui } from "../../features/ui";

const priorities: Record<string, string> = { LOW: "Baixa", NORMAL: "Normal", HIGH: "Alta", CRITICAL: "Crítica" };

export function NoticeSummary({ item }: { item: Notice }) {
  return <>
    <Text style={ui.text}>{item.message}</Text>
    <Text style={ui.subdued}>{item.type_label} · Prioridade {priorities[item.priority] ?? item.priority}</Text>
    <Text style={ui.subdued}>{item.school_name ?? "Organização"} · {stamp(item.created_at)}</Text>
    <Text style={item.read_at ? ui.subdued : ui.warning}>{item.read_at ? "Lida" : "Não lida"}</Text>
  </>;
}
