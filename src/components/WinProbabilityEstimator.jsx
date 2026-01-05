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

    useEffect(() => {
        const fetchEstimation = async () => {
            // Reset se non ci sono squadre
            if (!homeTeam && !awayTeam) {
                setEstimation(null);
                setDebugInfo(null);
                return;
            }

            setLoading(true);
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
                        .select('ft_result, ft_home, ft_away, match_date, home_team, away_team')
                        .ilike('home_team', `%${homeTeam}%`)
                        .ilike('away_team', `%${awayTeam}%`)
                        .order('match_date', { ascending: false });

                    if (error) {
                        debug.steps.push(`❌ Errore database: ${error.message}`);
                    } else if (data) {
                        h2hMatches = data;
                        debug.steps.push(`✓ Trovati ${h2hMatches.length} scontri diretti`);
                    }
                }

                let analyzedMatches = [];

                // STEP 2: Decidi quale dataset usare
                if (h2hMatches.length >= 3) {
                    analyzedMatches = h2hMatches;
                    analysisType = 'H2H';
                    dataSource = `${h2hMatches.length} scontri diretti`;
                    debug.steps.push(`✅ Uso scontri diretti (${h2hMatches.length} partite)`);
                } else if (h2hMatches.length > 0 && h2hMatches.length < 3) {
                    debug.steps.push(`⚠️ Solo ${h2hMatches.length} scontri diretti (servono almeno 3)`);
                    debug.steps.push(`🔄 Passo alla forma generale della squadra di casa...`);
                }

                // STEP 3: Fallback su forma casa
                if (analyzedMatches.length === 0 && homeTeam && homeTeam.length > 2) {
                    const { data: homeMatches, error } = await supabase
                        .from('historical_matches')
                        .select('ft_result, ft_home, ft_away, home_team')
                        .ilike('home_team', `%${homeTeam}%`)
                        .order('match_date', { ascending: false })
                        .limit(50);

                    if (error) {
                        debug.steps.push(`❌ Errore nel recupero forma casa: ${error.message}`);
                    } else if (homeMatches && homeMatches.length > 0) {
                        analyzedMatches = homeMatches;
                        analysisType = 'Forma Casa';
                        dataSource = `${homeMatches.length} partite in casa`;
                        debug.steps.push(`✓ Trovate ${homeMatches.length} partite in casa di ${homeTeam}`);
                    } else {
                        debug.steps.push(`❌ Nessuna partita trovata per "${homeTeam}"`);
                    }
                }

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
                } else {
                    debug.steps.push(`❌ Nessun dato disponibile per l'analisi`);
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

            {estimation && !loading && (
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
            )}
        </div>
    );
}

export default SuperquoteAnalyzer;
