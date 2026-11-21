import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export async function openReportFile(bytes: ArrayBuffer, format: 'pdf' | 'csv', signal?: AbortSignal, share = false) {
    if (signal?.aborted) return;
    const name = `reali-relatorio.${format}`;
    const mime = format === 'csv' ? 'text/csv' : 'application/pdf';

    if (Platform.OS === 'web') {
        const blob = new Blob([bytes], { type: mime });
        if (share && navigator.share && navigator.canShare) {
            const files = [new globalThis.File([blob], name, { type: mime })];
            if (navigator.canShare({ files })) {
                try {
                    await navigator.share({ files });
                    return;
                } catch (error) {
                    if (error instanceof Error && error.name === 'AbortError') return;
                    if (!(error instanceof Error) || error.name !== 'NotAllowedError') throw error;
                }
            }
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
    }

    if (!await Sharing.isAvailableAsync()) throw new Error('O compartilhamento de arquivos está indisponível.');
    if (signal?.aborted) return;
    const file = new File(Paths.cache, `reali-${randomUUID()}.${format}`);
    try {
        file.create();
        file.write(new Uint8Array(bytes));
        await Sharing.shareAsync(file.uri, { mimeType: mime, UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text' });
    } finally {
        if (file.exists) file.delete();
    }
}
