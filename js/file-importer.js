// js/file-importer.js

import { membros, restricoes, restricoesPermanentes } from './data-manager.js';
import { renderEscalaEmCards, configurarDragAndDrop, exibirIndiceEquilibrio, showToast } from './ui.js';

export function setupXLSXImporter() {
    const btnImportar = document.getElementById('btn-importar-xlsx');
    const inputImportar = document.getElementById('input-importar-xlsx');

    if (!btnImportar || !inputImportar) {
        return; // Elementos não existem, não faz nada.
    }

    btnImportar.addEventListener('click', () => {
        inputImportar.click(); // Aciona o input de arquivo escondido
    });

    inputImportar.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Transforma os dados da planilha para a estrutura interna da aplicação
                const diasTransformados = jsonData.map((row, index) => {
                    if (!row.Data || !row.Turno) return null;

                    const [day, month, year] = row.Data.split('/');
                    const dataObj = new Date(year, month - 1, day);

                    const selecionados = [];
                    let i = 1;
                    while (row[`Membro ${i}`]) {
                        const nomeMembro = row[`Membro ${i}`].trim();
                        const membroObj = membros.find(m => m.nome === nomeMembro);
                        if (membroObj) {
                            selecionados.push(membroObj);
                        }
                        i++;
                    }
                    
                    return {
                        id: `importado-${index}`,
                        data: dataObj,
                        tipo: row.Turno,
                        selecionados: selecionados
                    };
                }).filter(dia => dia !== null && !isNaN(dia.data.getTime()));

                if (diasTransformados.length === 0) {
                    showToast('A planilha está vazia ou em formato incorreto.', 'error');
                    return;
                }

                const justificationDataRecalculado = {};
                membros.forEach(m => {
                    justificationDataRecalculado[m.nome] = { participations: 0 };
                });
                diasTransformados.forEach(dia => {
                    dia.selecionados.forEach(membro => {
                        if (justificationDataRecalculado[membro.nome]) {
                            justificationDataRecalculado[membro.nome].participations++;
                        }
                    });
                });
                
                renderEscalaEmCards(diasTransformados);
                configurarDragAndDrop(diasTransformados, justificationDataRecalculado, restricoes, restricoesPermanentes);
                exibirIndiceEquilibrio(justificationDataRecalculado);

                showToast('Escala importada com sucesso!', 'success');
                document.getElementById('resultadoEscala').scrollIntoView({ behavior: 'smooth' });

            } catch (error) {
                console.error("Erro ao importar a planilha:", error);
                showToast('Ocorreu um erro ao ler o arquivo. Verifique o formato.', 'error');
            }
        };
        reader.readAsArrayBuffer(file);
        
        event.target.value = '';
    });
}