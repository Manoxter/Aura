/**
 * Utilitário de Feriados Brasileiros para o Aura v6.1
 * Calcula feriados nacionais móveis e fixos.
 */

export interface Holiday {
    data: string; // YYYY-MM-DD
    nome: string;
    tipo: 'nacional' | 'estadual' | 'municipal';
    trabalha?: boolean; // Se o projeto trabalha neste feriado
    regime_especial?: 'folga' | 'meio_periodo' | 'plantao' | 'normal';
    hora_inicio?: string; // HH:MM — inicio do expediente especial
    hora_fim?: string;    // HH:MM — fim do expediente especial
}

function getPascoa(ano: number): Date {
    const a = ano % 19;
    const b = Math.floor(ano / 100);
    const c = ano % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const mes = Math.floor((h + l - 7 * m + 114) / 31);
    const dia = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(ano, mes - 1, dia);
}

/**
 * Helper: get the Nth occurrence of a weekday in a given month.
 * weekday: 0=Sunday, 1=Monday, ... 6=Saturday
 * n: 1-based (1st, 2nd, 3rd, 4th, 5th)
 */
function nthWeekday(ano: number, mes: number, weekday: number, n: number): Date {
    const first = new Date(ano, mes - 1, 1);
    const dayOfWeek = first.getDay();
    const diff = (weekday - dayOfWeek + 7) % 7;
    const day = 1 + diff + (n - 1) * 7;
    return new Date(ano, mes - 1, day);
}

/**
 * Helper: get the LAST occurrence of a weekday in a given month.
 */
function lastWeekday(ano: number, mes: number, weekday: number): Date {
    const lastDay = new Date(ano, mes, 0); // last day of the month
    const dayOfWeek = lastDay.getDay();
    const diff = (dayOfWeek - weekday + 7) % 7;
    return new Date(ano, mes - 1, lastDay.getDate() - diff);
}

function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function getFeriadosNacionais(ano: number, pais: string = 'Brasil'): Holiday[] {
    if (pais === 'Argentina') {
        return [
            { data: `${ano}-01-01`, nome: 'Año Nuevo', tipo: 'nacional' },
            { data: `${ano}-03-24`, nome: 'Día de la Memoria', tipo: 'nacional' },
            { data: `${ano}-04-02`, nome: 'Día de las Malvinas', tipo: 'nacional' },
            { data: `${ano}-05-01`, nome: 'Día do Trabalho', tipo: 'nacional' },
            { data: `${ano}-05-25`, nome: 'Revolución de Mayo', tipo: 'nacional' },
            { data: `${ano}-06-20`, nome: 'Día de la Bandera', tipo: 'nacional' },
            { data: `${ano}-07-09`, nome: 'Día de la Independencia', tipo: 'nacional' },
            { data: `${ano}-12-08`, nome: 'Inmaculada Concepción', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Navidad', tipo: 'nacional' },
        ];
    }

    if (pais === 'United States') {
        return ([
            { data: `${ano}-01-01`, nome: "New Year's Day", tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 1, 1, 3)), nome: 'Martin Luther King Jr. Day', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 2, 1, 3)), nome: "Presidents' Day", tipo: 'nacional' },
            { data: formatDate(lastWeekday(ano, 5, 1)), nome: 'Memorial Day', tipo: 'nacional' },
            { data: `${ano}-06-19`, nome: 'Juneteenth', tipo: 'nacional' },
            { data: `${ano}-07-04`, nome: 'Independence Day', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 9, 1, 1)), nome: 'Labor Day', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 10, 1, 2)), nome: 'Columbus Day', tipo: 'nacional' },
            { data: `${ano}-11-11`, nome: 'Veterans Day', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 11, 4, 4)), nome: 'Thanksgiving', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Christmas Day', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'United Kingdom') {
        const pascoa = getPascoa(ano);
        return ([
            { data: `${ano}-01-01`, nome: "New Year's Day", tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 2)), nome: 'Good Friday', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 1)), nome: 'Easter Monday', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 5, 1, 1)), nome: 'Early May Bank Holiday', tipo: 'nacional' },
            { data: formatDate(lastWeekday(ano, 5, 1)), nome: 'Spring Bank Holiday', tipo: 'nacional' },
            { data: formatDate(lastWeekday(ano, 8, 1)), nome: 'Summer Bank Holiday', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Christmas Day', tipo: 'nacional' },
            { data: `${ano}-12-26`, nome: 'Boxing Day', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'Portugal') {
        const pascoa = getPascoa(ano);
        return ([
            { data: `${ano}-01-01`, nome: 'Ano Novo', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 47)), nome: 'Carnaval', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 2)), nome: 'Sexta-feira Santa', tipo: 'nacional' },
            { data: formatDate(pascoa), nome: 'Páscoa', tipo: 'nacional' },
            { data: `${ano}-04-25`, nome: 'Dia da Liberdade', tipo: 'nacional' },
            { data: `${ano}-05-01`, nome: 'Dia do Trabalhador', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 60)), nome: 'Corpo de Deus', tipo: 'nacional' },
            { data: `${ano}-06-10`, nome: 'Dia de Portugal', tipo: 'nacional' },
            { data: `${ano}-08-15`, nome: 'Assunção de Nossa Senhora', tipo: 'nacional' },
            { data: `${ano}-10-05`, nome: 'Implantação da República', tipo: 'nacional' },
            { data: `${ano}-11-01`, nome: 'Dia de Todos os Santos', tipo: 'nacional' },
            { data: `${ano}-12-01`, nome: 'Restauração da Independência', tipo: 'nacional' },
            { data: `${ano}-12-08`, nome: 'Imaculada Conceição', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Natal', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'Germany') {
        const pascoa = getPascoa(ano);
        return ([
            { data: `${ano}-01-01`, nome: 'Neujahrstag', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 2)), nome: 'Karfreitag', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 1)), nome: 'Ostermontag', tipo: 'nacional' },
            { data: `${ano}-05-01`, nome: 'Tag der Arbeit', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 39)), nome: 'Christi Himmelfahrt', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 50)), nome: 'Pfingstmontag', tipo: 'nacional' },
            { data: `${ano}-10-03`, nome: 'Tag der Deutschen Einheit', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Weihnachtstag', tipo: 'nacional' },
            { data: `${ano}-12-26`, nome: 'Zweiter Weihnachtstag', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'France') {
        const pascoa = getPascoa(ano);
        return ([
            { data: `${ano}-01-01`, nome: 'Jour de l\'An', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 1)), nome: 'Lundi de Pâques', tipo: 'nacional' },
            { data: `${ano}-05-01`, nome: 'Fête du Travail', tipo: 'nacional' },
            { data: `${ano}-05-08`, nome: 'Victoire 1945', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 39)), nome: 'Ascension', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 50)), nome: 'Lundi de Pentecôte', tipo: 'nacional' },
            { data: `${ano}-07-14`, nome: 'Fête Nationale', tipo: 'nacional' },
            { data: `${ano}-08-15`, nome: 'Assomption', tipo: 'nacional' },
            { data: `${ano}-11-01`, nome: 'Toussaint', tipo: 'nacional' },
            { data: `${ano}-11-11`, nome: 'Armistice', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Noël', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'Spain') {
        const pascoa = getPascoa(ano);
        return ([
            { data: `${ano}-01-01`, nome: 'Año Nuevo', tipo: 'nacional' },
            { data: `${ano}-01-06`, nome: 'Epifanía del Señor', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 2)), nome: 'Viernes Santo', tipo: 'nacional' },
            { data: `${ano}-05-01`, nome: 'Fiesta del Trabajo', tipo: 'nacional' },
            { data: `${ano}-08-15`, nome: 'Asunción de la Virgen', tipo: 'nacional' },
            { data: `${ano}-10-12`, nome: 'Fiesta Nacional de España', tipo: 'nacional' },
            { data: `${ano}-11-01`, nome: 'Todos los Santos', tipo: 'nacional' },
            { data: `${ano}-12-06`, nome: 'Día de la Constitución', tipo: 'nacional' },
            { data: `${ano}-12-08`, nome: 'Inmaculada Concepción', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Navidad', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'Canada') {
        const pascoa = getPascoa(ano);
        return ([
            { data: `${ano}-01-01`, nome: "New Year's Day", tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 2)), nome: 'Good Friday', tipo: 'nacional' },
            { data: formatDate(lastWeekday(ano, 5, 1)), nome: 'Victoria Day', tipo: 'nacional' },
            { data: `${ano}-07-01`, nome: 'Canada Day', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 9, 1, 1)), nome: 'Labour Day', tipo: 'nacional' },
            { data: `${ano}-09-30`, nome: 'National Day for Truth and Reconciliation', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 10, 1, 2)), nome: 'Thanksgiving', tipo: 'nacional' },
            { data: `${ano}-11-11`, nome: 'Remembrance Day', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Christmas Day', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'Mexico') {
        return ([
            { data: `${ano}-01-01`, nome: 'Año Nuevo', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 2, 1, 1)), nome: 'Día de la Constitución', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 3, 1, 3)), nome: 'Natalicio de Benito Juárez', tipo: 'nacional' },
            { data: `${ano}-05-01`, nome: 'Día del Trabajo', tipo: 'nacional' },
            { data: `${ano}-09-16`, nome: 'Día de la Independencia', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 11, 1, 3)), nome: 'Revolución Mexicana', tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Navidad', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'UAE') {
        return ([
            { data: `${ano}-01-01`, nome: 'New Year\'s Day', tipo: 'nacional' },
            { data: `${ano}-12-01`, nome: 'Commemoration Day', tipo: 'nacional' },
            { data: `${ano}-12-02`, nome: 'National Day', tipo: 'nacional' },
            { data: `${ano}-12-03`, nome: 'National Day Holiday', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    if (pais === 'Australia') {
        const pascoa = getPascoa(ano);
        return ([
            { data: `${ano}-01-01`, nome: "New Year's Day", tipo: 'nacional' },
            { data: `${ano}-01-26`, nome: 'Australia Day', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 2)), nome: 'Good Friday', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() - 1)), nome: 'Saturday before Easter', tipo: 'nacional' },
            { data: formatDate(new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + 1)), nome: 'Easter Monday', tipo: 'nacional' },
            { data: `${ano}-04-25`, nome: 'Anzac Day', tipo: 'nacional' },
            { data: formatDate(nthWeekday(ano, 6, 1, 2)), nome: "Queen's Birthday", tipo: 'nacional' },
            { data: `${ano}-12-25`, nome: 'Christmas Day', tipo: 'nacional' },
            { data: `${ano}-12-26`, nome: 'Boxing Day', tipo: 'nacional' },
        ] as Holiday[]).sort((a, b) => a.data.localeCompare(b.data));
    }

    // Default: Brasil
    const pascoa = getPascoa(ano);

    // Feriados Móveis (baseados na Páscoa) - Brasil
    const adicionarDias = (data: Date, dias: number) => {
        const d = new Date(data);
        d.setDate(d.getDate() + dias);
        return d.toISOString().split('T')[0];
    };

    const feriados: Holiday[] = [
        // Fixos
        { data: `${ano}-01-01`, nome: 'Confraternização Universal', tipo: 'nacional' },
        { data: `${ano}-04-21`, nome: 'Tiradentes', tipo: 'nacional' },
        { data: `${ano}-05-01`, nome: 'Dia do Trabalho', tipo: 'nacional' },
        { data: `${ano}-09-07`, nome: 'Independência do Brasil', tipo: 'nacional' },
        { data: `${ano}-10-12`, nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
        { data: `${ano}-11-02`, nome: 'Finados', tipo: 'nacional' },
        { data: `${ano}-11-15`, nome: 'Proclamação da República', tipo: 'nacional' },
        { data: `${ano}-11-20`, nome: 'Consciência Negra', tipo: 'nacional' },
        { data: `${ano}-12-25`, nome: 'Natal', tipo: 'nacional' },

        // Móveis
        { data: adicionarDias(pascoa, -47), nome: 'Carnaval', tipo: 'nacional' },
        { data: adicionarDias(pascoa, -46), nome: 'Quarta-feira de Cinzas', tipo: 'nacional' },
        { data: adicionarDias(pascoa, -2), nome: 'Sexta-feira Santa', tipo: 'nacional' },
        { data: adicionarDias(pascoa, 0), nome: 'Páscoa', tipo: 'nacional' },
        { data: adicionarDias(pascoa, 60), nome: 'Corpus Christi', tipo: 'nacional' },
    ];

    return feriados.sort((a, b) => a.data.localeCompare(b.data));
}

// Feriados Estaduais/Municipais
export function getFeriadosLocais(ano: number, estado: string, cidade: string, pais: string = 'Brasil'): Holiday[] {
    const locais: Holiday[] = [];

    if (pais === 'Brasil') {
        if (estado === 'SP') {
            locais.push({ data: `${ano}-07-09`, nome: 'Revolução Constitucionalista', tipo: 'estadual' });
        }
        if (cidade === 'São Paulo' || cidade === 'Sao Paulo') {
            locais.push({ data: `${ano}-01-25`, nome: 'Aniversário de São Paulo', tipo: 'municipal' });
        }
    }

    if (pais === 'United States') {
        // Massachusetts (Big Dig critical)
        if (estado === 'MA') {
            locais.push({
                data: formatDate(nthWeekday(ano, 4, 1, 3)),
                nome: "Patriots' Day",
                tipo: 'estadual'
            });
            // Evacuation Day - Suffolk County (Boston, Chelsea, Revere, Winthrop)
            if (['Boston', 'Chelsea', 'Revere', 'Winthrop'].includes(cidade)) {
                locais.push({
                    data: `${ano}-03-17`,
                    nome: 'Evacuation Day',
                    tipo: 'municipal'
                });
                locais.push({
                    data: `${ano}-06-17`,
                    nome: 'Bunker Hill Day',
                    tipo: 'municipal'
                });
            }
        }
        // New York — Lincoln's Birthday
        if (estado === 'NY') {
            locais.push({ data: `${ano}-02-12`, nome: "Lincoln's Birthday", tipo: 'estadual' });
        }
        // Texas — state holidays
        if (estado === 'TX') {
            locais.push({ data: `${ano}-03-02`, nome: 'Texas Independence Day', tipo: 'estadual' });
            locais.push({ data: `${ano}-04-21`, nome: 'San Jacinto Day', tipo: 'estadual' });
            locais.push({ data: `${ano}-06-19`, nome: 'Emancipation Day', tipo: 'estadual' });
        }
        // California — César Chávez Day
        if (estado === 'CA') {
            locais.push({ data: `${ano}-03-31`, nome: 'César Chávez Day', tipo: 'estadual' });
        }
    }

    return locais;
}
