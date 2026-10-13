import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  Footer,
  PageNumber,
} from 'docx';
import { TeacherLessonPlan } from '../types';

/**
 * Generates and downloads an official-style Microsoft Word (.docx) document
 * for a MINERD Teacher Lesson Plan.
 */
export async function downloadLessonPlanAsWord(
  plan: TeacherLessonPlan,
  customFileName?: string
): Promise<void> {
  const primaryColor = '003876'; // MINERD Navy Blue
  const secondaryColor = 'CE1126'; // Dominican Red accent
  const lightBgColor = 'F0F4F8';
  const borderColor = 'D1D5DB';

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Ministerio de Educación de la República Dominicana (MINERD) • Planificación Curricular • Página ',
                    size: 18,
                    color: '6B7280',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '6B7280',
                    bold: true,
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 18,
                    color: '6B7280',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '6B7280',
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // 1. INSTITUTIONAL HEADER
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'REPÚBLICA DOMINICANA',
                bold: true,
                size: 26,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'MINISTERIO DE EDUCACIÓN (MINERD)',
                bold: true,
                size: 24,
                color: primaryColor,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'DIRECCIÓN GENERAL DE CURRÍCULO • GESTIÓN Y PLANIFICACIÓN DOCENTE',
                size: 18,
                color: '4B5563',
                italics: true,
              }),
            ],
          }),

          // TITLE BANNER
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: primaryColor },
                    margins: { top: 160, bottom: 160, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'PLANIFICACIÓN DE UNIDAD DE APRENDIZAJE / CLASE',
                            bold: true,
                            size: 24,
                            color: 'FFFFFF',
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 80 },
                        children: [
                          new TextRun({
                            text: plan.title || 'Tema Curricular',
                            bold: true,
                            size: 22,
                            color: 'FFD166',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ spacing: { before: 200, after: 100 }, children: [] }),

          // 2. METADATA TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createMetaCell('Área / Asignatura:', plan.subject || 'General', true),
                  createMetaCell('Grado / Nivel:', plan.grade || 'Secundaria', false),
                ],
              }),
              new TableRow({
                children: [
                  createMetaCell('Tiempo Estimado:', plan.duration || '45 minutos', true),
                  createMetaCell(
                    'Fecha de Planificación:',
                    new Date().toLocaleDateString('es-DO', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }),
                    false
                  ),
                ],
              }),
              new TableRow({
                children: [
                  createMetaCell('Centro Educativo:', 'Distrito Educativo MINERD', true),
                  createMetaCell('Docente Responsable:', 'Docente Titular de Área', false),
                ],
              }),
            ],
          }),

          // 3. COMPETENCIAS FUNDAMENTALES
          createSectionHeader('1. COMPETENCIAS FUNDAMENTALES (MINERD)', primaryColor),
          ...(plan.fundamentalCompetencies && plan.fundamentalCompetencies.length > 0
            ? plan.fundamentalCompetencies.map(
                (comp) =>
                  new Paragraph({
                    bullet: { level: 0 },
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: comp,
                        size: 20,
                        color: '1F2937',
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '• Pensamiento Lógico, Creativo y Crítico\n• Resolución de Problemas\n• Científica y Tecnológica\n• Ética y Ciudadana\n• Comunicativa',
                      size: 20,
                    }),
                  ],
                }),
              ]),

          // 4. COMPETENCIAS ESPECÍFICAS
          createSectionHeader('2. COMPETENCIAS ESPECÍFICAS DEL ÁREA', primaryColor),
          ...(plan.specificCompetencies && plan.specificCompetencies.length > 0
            ? plan.specificCompetencies.map(
                (comp) =>
                  new Paragraph({
                    bullet: { level: 0 },
                    spacing: { before: 60, after: 60 },
                    children: [
                      new TextRun({
                        text: comp,
                        size: 20,
                        color: '1F2937',
                      }),
                    ],
                  })
              )
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Aplica conceptos, modelos y procedimientos para resolver situaciones problemáticas vinculadas a su contexto social y natural.',
                      size: 20,
                    }),
                  ],
                }),
              ]),

          // 5. SITUACIÓN DE APRENDIZAJE
          createSectionHeader('3. SITUACIÓN DE APRENDIZAJE', primaryColor),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: 'F9FAFB' },
                    borders: {
                      left: { style: BorderStyle.SINGLE, size: 24, color: secondaryColor },
                      top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
                      right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
                      bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
                    },
                    margins: { top: 140, bottom: 140, left: 180, right: 180 },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: plan.learningSituation ||
                              'Los estudiantes del centro educativo analizan y aplican los contenidos curriculares abordando problemáticas reales de su comunidad, fortaleciendo el pensamiento crítico, la investigación y la colaboración activa.',
                            size: 20,
                            italics: true,
                            color: '111827',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),

          // 6. SECUENCIA DIDÁCTICA (FASES DE LA CLASE)
          createSectionHeader('4. SECUENCIA DIDÁCTICA (MOMENTOS DE LA CLASE)', primaryColor),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header Row
              new TableRow({
                tableHeader: true,
                children: [
                  createTableHeaderCell('Momento / Tiempo', 20),
                  createTableHeaderCell('Actividades de Enseñanza (Docente)', 32),
                  createTableHeaderCell('Actividades de Aprendizaje (Estudiantes)', 32),
                  createTableHeaderCell('Recursos Didácticos', 16),
                ],
              }),
              // Didactic Sequence Rows
              ...(plan.didacticSequence || []).map((seq) => {
                return new TableRow({
                  children: [
                    new TableCell({
                      width: { size: 20, type: WidthType.PERCENTAGE },
                      shading: { type: ShadingType.CLEAR, fill: lightBgColor },
                      margins: { top: 120, bottom: 120, left: 120, right: 120 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: seq.phase,
                              bold: true,
                              size: 20,
                              color: primaryColor,
                            }),
                          ],
                        }),
                        new Paragraph({
                          spacing: { before: 40 },
                          children: [
                            new TextRun({
                              text: `(${seq.durationMinutes} min)`,
                              size: 18,
                              color: '4B5563',
                              italics: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 32, type: WidthType.PERCENTAGE },
                      margins: { top: 120, bottom: 120, left: 120, right: 120 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: seq.teacherActivity || 'Guía y orienta el proceso de aprendizaje.',
                              size: 19,
                              color: '1F2937',
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 32, type: WidthType.PERCENTAGE },
                      margins: { top: 120, bottom: 120, left: 120, right: 120 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: seq.studentActivity || 'Participan activamente e interactúan con sus pares.',
                              size: 19,
                              color: '1F2937',
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      width: { size: 16, type: WidthType.PERCENTAGE },
                      margins: { top: 120, bottom: 120, left: 120, right: 120 },
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: Array.isArray(seq.resources)
                                ? seq.resources.join(', ')
                                : (seq.resources || 'Pizarra, Cuaderno, Guía curricular'),
                              size: 18,
                              color: '4B5563',
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                });
              }),
            ],
          }),

          // 7. RÚBRICA DE EVALUACIÓN ANALÍTICA / INDICADORES
          createSectionHeader('5. EVALUACIÓN Y RÚBRICA ANALÍTICA POR NIVELES DE DOMINIO', primaryColor),
          ...(plan.evaluationRubric && plan.evaluationRubric.length > 0
            ? [
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      tableHeader: true,
                      children: [
                        createTableHeaderCell('Criterio / Indicador', 24),
                        createTableHeaderCell('Receptivo', 19),
                        createTableHeaderCell('Básico', 19),
                        createTableHeaderCell('Autónomo', 19),
                        createTableHeaderCell('Estratégico', 19),
                      ],
                    }),
                    ...plan.evaluationRubric.map((rubric) => {
                      return new TableRow({
                        children: [
                          new TableCell({
                            width: { size: 24, type: WidthType.PERCENTAGE },
                            shading: { type: ShadingType.CLEAR, fill: lightBgColor },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: rubric.indicator,
                                    bold: true,
                                    size: 19,
                                    color: primaryColor,
                                  }),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 19, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: rubric.levels?.receptive || 'Identifica nociones elementales.',
                                    size: 18,
                                  }),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 19, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: rubric.levels?.basic || 'Aplica conceptos con supervisión directa.',
                                    size: 18,
                                  }),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 19, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: rubric.levels?.autonomous || 'Resuelve de forma independiente.',
                                    size: 18,
                                  }),
                                ],
                              }),
                            ],
                          }),
                          new TableCell({
                            width: { size: 19, type: WidthType.PERCENTAGE },
                            margins: { top: 100, bottom: 100, left: 100, right: 100 },
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({
                                    text: rubric.levels?.strategic || 'Propone soluciones innovadoras y argumentadas.',
                                    size: 18,
                                  }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      });
                    }),
                  ],
                }),
              ]
            : [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Técnica de evaluación: Observación y producción de los estudiantes.\nInstrumento: Rúbrica formativa y lista de cotejo de evidencias.',
                      size: 20,
                    }),
                  ],
                }),
              ]),

          // 8. SIGNATURE SECTION
          new Paragraph({ spacing: { before: 400, after: 200 }, children: [] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    margins: { top: 80, bottom: 80, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Firma del Docente',
                            bold: true,
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Docente Titular',
                            size: 18,
                            color: '6B7280',
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.NONE },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    children: [new Paragraph({ children: [] })],
                  }),
                  new TableCell({
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 8, color: '000000' },
                      left: { style: BorderStyle.NONE },
                      right: { style: BorderStyle.NONE },
                      bottom: { style: BorderStyle.NONE },
                    },
                    margins: { top: 80, bottom: 80, left: 80, right: 80 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Firma del Coordinador Pedagógico',
                            bold: true,
                            size: 20,
                          }),
                        ],
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({
                            text: 'Unidad Técnico-Pedagógica',
                            size: 18,
                            color: '6B7280',
                          }),
                        ],
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  // Pack and trigger download
  const blob = await Packer.toBlob(doc);
  const rawTitle = plan.title || 'Planificacion_MINERD';
  const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ_-]/g, '_').substring(0, 50);
  const fileName = customFileName || `${cleanTitle}.docx`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helpers
function createSectionHeader(title: string, color: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 22,
        color: color,
      }),
    ],
  });
}

function createTableHeaderCell(title: string, widthPercent: number): TableCell {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: '003876' },
    margins: { top: 120, bottom: 120, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 19,
            color: 'FFFFFF',
          }),
        ],
      }),
    ],
  });
}

function createMetaCell(label: string, value: string, isLeft: boolean): TableCell {
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: isLeft ? 'F8FAFC' : 'FFFFFF' },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: `${label} `,
            bold: true,
            size: 19,
            color: '1F2937',
          }),
          new TextRun({
            text: value,
            size: 19,
            color: '374151',
          }),
        ],
      }),
    ],
  });
}
