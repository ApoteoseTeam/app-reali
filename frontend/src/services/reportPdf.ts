import { Directory, File as LocalFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

export type CanalRelatorio = 'WhatsApp' | 'E-mail';

export type ArquivoPdf = {
    nome: string;
    baixar: () => Promise<void>;
    compartilhar?: (canal: CanalRelatorio) => Promise<void>;
    abrirCanal: (canal: CanalRelatorio) => Promise<void>;
};

const mimeType = 'application/pdf';

export function prepararArquivoPdf(
    pdf: ArrayBuffer, nome: string, titulo: string, escola: string, verificarAcesso: () => void,
): ArquivoPdf {
    function abrirCanal(canal: CanalRelatorio) {
        verificarAcesso();
        const assunto = encodeURIComponent(titulo);
        const mensagem = encodeURIComponent(titulo + '\r\nEnvio o relatório em PDF.');
        return Linking.openURL(canal === 'WhatsApp'
            ? 'https://wa.me/?text=' + mensagem
            : `mailto:?subject=${assunto}&body=${mensagem}`);
    }

    if (Platform.OS === 'web') {
        const file = new File([pdf], nome, { type: mimeType });
        const dados = { files: [file], title: titulo };
        return {
            nome,
            abrirCanal,
            baixar: async () => {
                verificarAcesso();
                const url = URL.createObjectURL(file);
                const link = document.createElement('a');
                link.href = url;
                link.download = nome;
                document.body.appendChild(link);
                try {
                    link.click();
                } finally {
                    link.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }
            },
            compartilhar: typeof navigator.share === 'function' && navigator.canShare?.(dados)
                ? async () => {
                    verificarAcesso();
                    await navigator.share(dados);
                }
                : undefined,
        };
    }

    return {
        nome,
        abrirCanal,
        baixar: async () => {
            verificarAcesso();
            const pasta = await Directory.pickDirectoryAsync();
            verificarAcesso();
            const arquivo = pasta.createFile(nome, mimeType);
            try {
                await arquivo.write(pdf);
            } catch (error) {
                try { arquivo.delete(); } catch { /* Preserve the write error. */ }
                throw error;
            }
        },
        compartilhar: async canal => {
            verificarAcesso();
            if (!await Sharing.isAvailableAsync()) throw new Error('Compartilhamento indisponível.');
            verificarAcesso();
            const pasta = new Directory(Paths.cache, 'reali-relatorios', escola);
            pasta.create({ intermediates: true, idempotent: true });
            const arquivo = new LocalFile(pasta, nome);
            await arquivo.write(pdf);
            verificarAcesso();
            await Sharing.shareAsync(arquivo.uri, { mimeType, UTI: 'com.adobe.pdf', dialogTitle: 'Enviar por ' + canal });
        },
    };
}
