import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './WinProbabilityEstimator.css';

function SuperquoteAnalyzer() {
    const [oddsInput, setOddsInput] = useState('');
    const [homeTeam, setHomeTeam] = useState('');
    const [awayTeam, setAwayTeam] = useState('');
    const [outcome, setOutcome] = useState('1');
    const [estimation, setEstimation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [debugInfo, setDebugInfo] = useState(null);
    const [detailedStats, setDetailedStats] = useState(null);

    useEffect(() => {
        const fetchEstimation = async () => {
            // Reset se non ci sono squadre
            if (!homeTeam && !awayTeam) {
                setEstimation(null);
                setDebugInfo(null);
                setDetailedStats(null);
                return;
            }

            // VALIDAZIONE: Impedisci stessa squadra vs se stessa
            if (homeTeam && awayTeam && homeTeam.trim().toLowerCase() === awayTeam.trim().toLowerCase()) {
                // CLEAR EVERYTHING to prevent sticky results
                setEstimation(null);
                setDetailedStats(null);
                setDebugInfo({
                    steps: ['❌ ERRORE: Una squadra non può giocare contro se stessa!']
                });

                // FORCE ERROR MESSAGE DISPLAY via explicit object
                setEstimation({
                    noDataInfo: true,
                    message: "Una squadra non può giocare contro se stessa! Inserisci due squadre diverse."
                });

                setLoading(false);
                return; // STOP EXECUTION
            }

            setLoading(true);
            setEstimation(null); // Clear previous results before new fetch
            const targetQuota = oddsInput ? parseFloat(oddsInput) : null;
            const debug = { steps: [] };

            try {
                let teamWinRate = null;
                let sampleSize = 0;
                let eloProba = null;
                let eloDiff = null;
                let analysisType = '';
                let dataSource = '';

                // STEP 1: Cerca Scontri Diretti (H2H)
                debug.steps.push(`🔍 Cerco scontri diretti tra "${homeTeam}" e "${awayTeam}"...`);

                let h2hMatches = [];
                if (homeTeam && awayTeam) {
                    const { data, error } = await supabase
                        .from('historical_matches')
                        .select('ft_result, ft_home, ft_away, ht_home, ht_away, home_corners, away_corners, home_yellow, away_yellow, home_red, away_red, match_date, home_team, away_team')
                        .or(`and(home_team.ilike.%${homeTeam}%,away_team.ilike.%${awayTeam}%),and(home_team.ilike.%${awayTeam}%,away_team.ilike.%${homeTeam}%)`)
                        .order('match_date', { ascending: false });

                    if (error) {
                        debug.steps.push(`❌ Errore database: ${error.message}`);
                    } else if (data) {
                        // DEDUPLICAZIONE IMMEDIATA (Fix per righe doppie)
                        const seen = new Set();
                        h2hMatches = data.filter(m => {
                            // Chiave univoca basata su data e squadre
                            const key = `${m.match_date}_${m.home_team}_${m.away_team}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                        });

                        debug.steps.push(`✓ Trovati ${h2hMatches.length} scontri diretti`);
                        if (h2hMatches.length > 0) {
                            debug.steps.push(`📅 Date recenti trovate: ${h2hMatches.slice(0, 3).map(m => m.match_date).join(', ')}`);
                        }
                    }
                }

                let analyzedMatches = [];

                // STEP 1.1: Filtra i risultati per evitare falsi positivi (es. "Inter Milan" cercando "Milan")
                if (h2hMatches.length > 0) {
                    h2hMatches = h2hMatches.filter(m => {
                        const h = m.home_team.toLowerCase();
                        const a = m.away_team.toLowerCase();
                        const searchH = homeTeam.toLowerCase().trim();
                        const searchA = awayTeam.toLowerCase().trim();

                        // Se cerchi "Milan", escludi "Inter"
                        if (searchH === 'milan' && h.includes('inter')) return false;
                        if (searchA === 'milan' && a.includes('inter')) return false;

                        return true;
                    });
                }

                // STEP 2: Logica Rigorosa - Priorità H2H o Stop
                if (h2hMatches.length > 0) {
                    analyzedMatches = h2hMatches;
                    analysisType = 'H2H';
                    dataSource = `Scontri Diretti (${h2hMatches.length} match)`;
                    debug.steps.push(`✅ Uso ${h2hMatches.length} scontri diretti trovati.`);

                    if (h2hMatches.length < 3) {
                        debug.steps.push(`⚠️ Attenzione: Pochi dati (${h2hMatches.length}), analisi meno affidabile.`);
                    }
                } else {
                    // NESSUN match H2H trovato
                    debug.steps.push(`❌ Nessuno scontro diretto trovato tra ${homeTeam} e ${awayTeam}.`);
                    debug.steps.push(`ℹ️ L'analisi richiede scontri diretti per essere precisa. Fallback automatico disabilitato per evitare confusione.`);

                    // Mostra messaggio errore/info all'utente invece di dati a caso
                    setEstimation({
                        noDataInfo: true,
                        message: "Nessuno scontro diretto recente trovato. Prova con squadre diverse o controlla i nomi."
                    });
                    setDetailedStats(null); // Fix: Clear stats to avoid showing contradictory data
                    setLoading(false);
                    return;
                }

                // STEP 3: Fallback RIMOSSO (Forma Casa non verrà usata se mancano H2H)
                // Questo evita che Juve-Juve mostri le partite in casa della Juve


                // STEP 4: Calcola statistiche se abbiamo dati
                if (analyzedMatches.length > 0) {
                    let wins = 0;
                    const total = analyzedMatches.length;

                    // Conta le vittorie per l'esito selezionato
                    analyzedMatches.forEach(m => {
                        const homeGoals = parseFloat(m.ft_home) || 0;
                        const awayGoals = parseFloat(m.ft_away) || 0;

                        if (outcome === '1' && m.ft_result === 'H') wins++;
                        else if (outcome === 'X' && m.ft_result === 'D') wins++;
                        else if (outcome === '2' && m.ft_result === 'A') wins++;
                        else if (outcome === '1X' && (m.ft_result === 'H' || m.ft_result === 'D')) wins++;
                        else if (outcome === 'X2' && (m.ft_result === 'A' || m.ft_result === 'D')) wins++;
                        else if (outcome === '12' && (m.ft_result === 'H' || m.ft_result === 'A')) wins++;
                        else if (outcome === 'O2.5' && (homeGoals + awayGoals > 2.5)) wins++;
                        else if (outcome === 'U2.5' && (homeGoals + awayGoals < 2.5)) wins++;
                        else if (outcome === 'GG' && (homeGoals > 0 && awayGoals > 0)) wins++;
                        else if (outcome === 'NG' && (homeGoals === 0 || awayGoals === 0)) wins++;
                    });

                    teamWinRate = parseFloat(((wins / total) * 100).toFixed(1));
                    sampleSize = total;

                    const outcomeLabel = {
                        '1': 'Vittoria Casa',
                        'X': 'Pareggio',
                        '2': 'Vittoria Ospite',
                        '1X': 'Doppia Chance 1X',
                        'X2': 'Doppia Chance X2',
                        '12': 'Doppia Chance 12',
                        'O2.5': 'Over 2.5',
                        'U2.5': 'Under 2.5',
                        'GG': 'Goal',
                        'NG': 'No Goal'
                    }[outcome] || outcome;

                    debug.steps.push(`📊 Esito "${outcomeLabel}": ${wins}/${total} = ${teamWinRate}%`);

                    if (sampleSize < 10) {
                        debug.steps.push(`⚠️ ATTENZIONE: Campione molto piccolo (${sampleSize} partite)`);
                    }

                    // CALCOLA STATISTICHE DETTAGLIATE
                    const validMatches = analyzedMatches.filter(m =>
                        m.ft_home != null && m.ft_away != null
                    );

                    if (validMatches.length > 0) {
                        const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

                        // Rimuovi duplicati basandoti su data + score
                        const uniqueMatches = [];
                        const seen = new Set();

                        for (const match of validMatches) {
                            const key = `${match.match_date}-${match.ft_home}-${match.ft_away}`;
                            if (!seen.has(key)) {
                                seen.add(key);
                                uniqueMatches.push(match);
                            }
                        }

                        const stats = {
                            avgHomeCorners: avg(validMatches.map(m => m.home_corners || 0)),
                            avgAwayCorners: avg(validMatches.map(m => m.away_corners || 0)),
                            avgHomeYellow: avg(validMatches.map(m => m.home_yellow || 0)),
                            avgAwayYellow: avg(validMatches.map(m => m.away_yellow || 0)),
                            avgHomeRed: avg(validMatches.map(m => m.home_red || 0)),
                            avgAwayRed: avg(validMatches.map(m => m.away_red || 0)),
                            avgTotalGoals: avg(validMatches.map(m => (m.ft_home || 0) + (m.ft_away || 0))),
                            avgFirstHalfGoals: avg(validMatches.map(m => (m.ht_home || 0) + (m.ht_away || 0))),
                            avgSecondHalfGoals: avg(validMatches.map(m =>
                                ((m.ft_home || 0) + (m.ft_away || 0)) - ((m.ht_home || 0) + (m.ht_away || 0))
                            )),
                            lastResults: uniqueMatches.slice(0, 5).map(m => ({
                                date: m.match_date,
                                score: `${m.ft_home || 0}-${m.ft_away || 0}`,
                                result: m.ft_result,
                                homeTeam: m.home_team,
                                awayTeam: m.away_team
                            }))
                        };

                        setDetailedStats(stats);
                        debug.steps.push(`📈 Statistiche dettagliate calcolate su ${validMatches.length} partite`);
                    }
                } else {
                    debug.steps.push(`❌ Nessun dato disponibile per l'analisi`);
                    setDetailedStats(null);
                }

                // STEP 5: Calcola Elo (solo per 1X2)
                if (homeTeam && awayTeam && ['1', 'X', '2'].includes(outcome)) {
                    debug.steps.push(`🎯 Calcolo rating Elo...`);

                    const { data: lastHome } = await supabase
                        .from('historical_matches')
                        .select('home_elo, home_team')
                        .ilike('home_team', `%${homeTeam}%`)
                        .order('match_date', { ascending: false })
                        .limit(1);

                    const { data: lastAway } = await supabase
                        .from('historical_matches')
                        .select('away_elo, away_team')
                        .ilike('away_team', `%${awayTeam}%`)
                        .order('match_date', { ascending: false })
                        .limit(1);

                    if (lastHome?.[0]?.home_elo && lastAway?.[0]?.away_elo) {
                        const hElo = lastHome[0].home_elo;
                        const aElo = lastAway[0].away_elo;
                        eloDiff = (hElo - aElo).toFixed(0);

                        const dr = (hElo + 100) - aElo;
                        const probHome = 1 / (1 + Math.pow(10, -dr / 400));
                        const probDraw = 0.28 * Math.exp(-Math.pow(dr / 400, 2));
                        const probAway = 1 - probHome - probDraw;

                        if (outcome === '1') eloProba = (probHome * 100).toFixed(1);
                        else if (outcome === 'X') eloProba = (probDraw * 100).toFixed(1);
                        else if (outcome === '2') eloProba = (probAway * 100).toFixed(1);

                        debug.steps.push(`✓ Elo ${homeTeam}: ${hElo.toFixed(0)}, ${awayTeam}: ${aElo.toFixed(0)}`);
                        debug.steps.push(`✓ Probabilità Elo: ${eloProba}%`);
                    } else {
                        debug.steps.push(`⚠️ Rating Elo non disponibili`);
                    }
                }

                // STEP 6: Calcola probabilità implicita dalla quota
                const impliedProb = (targetQuota && targetQuota > 1) ? (100 / targetQuota).toFixed(1) : null;
                if (impliedProb) {
                    debug.steps.push(`💰 Quota ${targetQuota} → Probabilità implicita: ${impliedProb}%`);
                }

                // STEP 7: Determina probabilità reale e verdetto
                let verdict = "---";
                let verdictColor = "gray";
                let realProb = null;

                if (analysisType === 'H2H' && teamWinRate !== null) {
                    realProb = teamWinRate;
                    debug.steps.push(`🎲 Probabilità reale: ${realProb}% (da H2H)`);
                } else if (eloProba !== null && teamWinRate !== null) {
                    realProb = (parseFloat(eloProba) + teamWinRate) / 2;
                    debug.steps.push(`🎲 Probabilità reale: ${realProb.toFixed(1)}% (media Elo + Forma)`);
                } else if (eloProba !== null) {
                    realProb = parseFloat(eloProba);
                    debug.steps.push(`🎲 Probabilità reale: ${realProb}% (solo Elo)`);
                } else if (teamWinRate !== null) {
                    realProb = teamWinRate;
                    debug.steps.push(`🎲 Probabilità reale: ${realProb}% (solo storico)`);
                }

                if (realProb !== null && impliedProb !== null) {
                    const edge = realProb - parseFloat(impliedProb);
                    debug.steps.push(`📈 Edge: ${edge.toFixed(1)}% (Reale - Implicita)`);

                    if (edge > 5) {
                        verdict = "✅ CONVIENE";
                        verdictColor = "var(--win-color)";
                        debug.steps.push(`✅ VERDETTO: CONVIENE (edge > 5%)`);
                    } else if (edge < -5) {
                        verdict = "❌ NON CONVIENE";
                        verdictColor = "var(--loss-color)";
                        debug.steps.push(`❌ VERDETTO: NON CONVIENE (edge < -5%)`);
                    } else {
                        verdict = "⚠️ FAIR";
                        verdictColor = "#f1c40f";
                        debug.steps.push(`⚠️ VERDETTO: FAIR (edge tra -5% e +5%)`);
                    }
                } else if (realProb !== null) {
                    verdict = "Inserisci quota";
                    verdictColor = "#555";
                    debug.steps.push(`ℹ️ Inserisci una quota per il verdetto finale`);
                } else {
                    verdict = "Dati insufficienti";
                    verdictColor = "#555";
                    debug.steps.push(`❌ Impossibile calcolare: dati insufficienti`);
                }

                setEstimation({
                    historicalWinRate: teamWinRate,
                    sampleSize,
                    analysisType,
                    dataSource,
                    eloProba,
                    eloDiff,
                    impliedProb,
                    verdict,
                    verdictColor,
                    realProb: realProb ? realProb.toFixed(1) : null
                });

                setDebugInfo(debug);

            } catch (err) {
                console.error('Errore nell\'analisi:', err);
                setDebugInfo({ steps: [`❌ Errore: ${err.message}`] });
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchEstimation, 800);
        return () => clearTimeout(timeoutId);
    }, [oddsInput, homeTeam, awayTeam, outcome]);

    return (
        <div className="estimator-container">
            <div className="analyzer-header">
                <h3>🔮 Superquote Analyzer</h3>
                {estimation && estimation.verdict && (
                    <div className="verdict-badge" style={{ backgroundColor: estimation.verdictColor, color: '#000' }}>
                        {estimation.verdict}
                    </div>
                )}
            </div>

            <p className="estimator-desc">
                Analisi basata su {estimation?.dataSource || 'dati storici'} e rating Elo delle squadre.
            </p>

            <div className="estimator-grid">
                <div className="input-group">
                    <label>Squadra Casa</label>
                    <input
                        type="text"
                        value={homeTeam}
                        onChange={(e) => setHomeTeam(e.target.value)}
                        placeholder="Es. Juventus"
                    />
                </div>
                <div className="input-group">
                    <label>Squadra Ospite</label>
                    <input
                        type="text"
                        value={awayTeam}
                        onChange={(e) => setAwayTeam(e.target.value)}
                        placeholder="Es. Milan"
                    />
                </div>
                <div className="input-group">
                    <label>Esito</label>
                    <select value={outcome} onChange={(e) => setOutcome(e.target.value)}>
                        <option value="1">1 (Casa Vince)</option>
                        <option value="X">X (Pareggio)</option>
                        <option value="2">2 (Ospite Vince)</option>
                        <option value="1X">1X (Doppia Chance)</option>
                        <option value="X2">X2 (Doppia Chance)</option>
                        <option value="12">12 (Doppia Chance)</option>
                        <option value="O2.5">Over 2.5</option>
                        <option value="U2.5">Under 2.5</option>
                        <option value="GG">Goal</option>
                        <option value="NG">No Goal</option>
                    </select>
                </div>
                <div className="input-group">
                    <label>Quota (opzionale)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={oddsInput}
                        onChange={(e) => setOddsInput(e.target.value)}
                        placeholder="Es. 2.10"
                    />
                </div>
            </div>

            {loading && <div className="loading-bar">🔄 Analisi in corso...</div>}

            {/* Debug Info - Ragionamento Esplicito */}
            {debugInfo && debugInfo.steps.length > 0 && !loading && (
                <div className="debug-info">
                    <details>
                        <summary>📋 Mostra ragionamento dettagliato</summary>
                        <div className="debug-steps">
                            {debugInfo.steps.map((step, idx) => (
                                <div key={idx} className="debug-step">{step}</div>
                            ))}
                        </div>
                    </details>
                </div>
            )}

            {estimation && estimation.noDataInfo && !loading ? (
                <div className="no-data-message" style={{ padding: '20px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', marginTop: '20px' }}>
                    <h3 style={{ color: 'var(--secondary-color)', marginBottom: '10px' }}>⚠️ Nessun Risultato Trovato</h3>
                    <p style={{ color: 'var(--text-color)' }}>{estimation.message}</p>
                </div>
            ) : (estimation && !loading && (
                <div className="estimator-results">
                    {/* Quota Bookmaker */}
                    <div className="result-card implied">
                        <span className="label">Quota Bookmaker</span>
                        <div className="value">
                            {estimation.impliedProb ? `${estimation.impliedProb}%` : '---'}
                        </div>
                        <span className="sub">Probabilità Implicita</span>
                    </div>

                    {/* Statistica Squadra */}
                    <div className="result-card historical">
                        <span className="label">
                            {estimation.analysisType === 'H2H' ? 'Scontri Diretti' : 'Forma Casa'}
                        </span>
                        {estimation.historicalWinRate !== null ? (
                            <>
                                <div className={`value ${estimation.sampleSize < 10 ? 'warning' :
                                    parseFloat(estimation.historicalWinRate) > parseFloat(estimation.impliedProb || 0) ? 'good' : 'neutral'
                                    }`}>
                                    {estimation.historicalWinRate}%
                                </div>
                                <span className="sub">
                                    {estimation.dataSource}
                                    {estimation.sampleSize < 10 && ' ⚠️'}
                                </span>
                            </>
                        ) : (
                            <>
                                <div className="value na">---</div>
                                <span className="sub">Dati non disponibili</span>
                            </>
                        )}
                    </div>

                    {/* Elo */}
                    <div className="result-card elo">
                        <span className="label">Rating Elo</span>
                        {estimation.eloProba !== null ? (
                            <>
                                <div className={`value ${parseFloat(estimation.eloProba) > parseFloat(estimation.impliedProb || 0) ? 'good' : 'neutral'
                                    }`}>
                                    {estimation.eloProba}%
                                </div>
                                <span className="sub">Diff: {estimation.eloDiff > 0 ? '+' : ''}{estimation.eloDiff}</span>
                            </>
                        ) : (
                            <>
                                <div className="value na">---</div>
                                <span className="sub">Solo per 1X2</span>
                            </>
                        )}
                    </div>
                </div>
            ))}

            {/* Detailed Statistics Section */}
            {detailedStats && !loading && (
                <div className="detailed-stats-section">
                    <h4>📊 Statistiche Dettagliate</h4>

                    <div className="stats-grid">
                        {/* Last Results */}
                        <div className="stat-card">
                            <div className="stat-header">🏆 Ultimi Risultati</div>
                            <div className="last-results">
                                {detailedStats.lastResults.map((result, idx) => (
                                    <div key={idx} className="result-item">
                                        <span className="result-date">{result.date}</span>
                                        <span className="result-score">
                                            {result.score}
                                            {result.result === 'H' && ' 🟢'}
                                            {result.result === 'D' && ' 🟡'}
                                            {result.result === 'A' && ' 🔴'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Goals by Half */}
                        <div className="stat-card">
                            <div className="stat-header">⚽ Goal per Tempo</div>
                            <div className="stat-rows">
                                <div className="stat-row">
                                    <span>Primo Tempo:</span>
                                    <strong>{detailedStats.avgFirstHalfGoals} goal/partita</strong>
                                </div>
                                <div className="stat-row">
                                    <span>Secondo Tempo:</span>
                                    <strong>{detailedStats.avgSecondHalfGoals} goal/partita</strong>
                                </div>
                                <div className="stat-row total">
                                    <span>Totale:</span>
                                    <strong>{detailedStats.avgTotalGoals} goal/partita</strong>
                                </div>
                            </div>
                        </div>

                        {/* Corners */}
                        <div className="stat-card">
                            <div className="stat-header">🚩 Angoli</div>
                            <div className="stat-rows">
                                <div className="stat-row">
                                    <span>{homeTeam || 'Casa'}:</span>
                                    <strong>{detailedStats.avgHomeCorners} angoli/partita</strong>
                                </div>
                                <div className="stat-row">
                                    <span>{awayTeam || 'Ospite'}:</span>
                                    <strong>{detailedStats.avgAwayCorners} angoli/partita</strong>
                                </div>
                            </div>
                        </div>

                        {/* Cards */}
                        <div className="stat-card">
                            <div className="stat-header">🟨 Cartellini</div>
                            <div className="stat-rows">
                                <div className="stat-row">
                                    <span>{homeTeam || 'Casa'}:</span>
                                    <strong>{detailedStats.avgHomeYellow} 🟨 {detailedStats.avgHomeRed} 🟥</strong>
                                </div>
                                <div className="stat-row">
                                    <span>{awayTeam || 'Ospite'}:</span>
                                    <strong>{detailedStats.avgAwayYellow} 🟨 {detailedStats.avgAwayRed} 🟥</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SuperquoteAnalyzer;
