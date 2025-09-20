import generateMidiFromProgression from "./midiWriter.js";

const scalePoints = {
    "major": {"sad-cheerful": -4, "mysterious-mundane": 0, "tense-calm": -2},
    "natural minor": {"sad-cheerful": 3, "mysterious-mundane": 2, "tense-calm": 3},
    "harmonic minor": {"sad-cheerful": 4, "mysterious-mundane": 3, "tense-calm": 3},
    "melodic minor": {"sad-cheerful": 4, "mysterious-mundane": 4, "tense-calm": 3},
    "dorian": {"sad-cheerful": 2, "mysterious-mundane": 5, "tense-calm": -3},
    "phrygian": {"sad-cheerful": 4, "mysterious-mundane": 3, "tense-calm": 4},
    "lydian": {"sad-cheerful": -5, "mysterious-mundane": 1, "tense-calm": -2},
    "mixolydian": {"sad-cheerful": -3, "mysterious-mundane": 1, "tense-calm": 0},
    "locrian": {"sad-cheerful": 5, "mysterious-mundane": 4, "tense-calm": 5}
};

const chordPoints = {
    "minor": {"sad-cheerful": 5, "mysterious-mundane": 0, "tense-calm": 3},
    "major": {"sad-cheerful": -5, "mysterious-mundane": 0, "tense-calm": -3},
    "diminished": {"sad-cheerful": -5, "mysterious-mundane": 2, "tense-calm": 5}
};

const scaleChords = {
    "major": ["major", "minor", "minor", "major", "major", "minor", "diminished"],
    "natural minor": ["minor", "diminished", "major", "minor", "minor", "major", "major"],
    "harmonic minor": ["minor", "diminished", "major", "minor", "major", "major", "major"],
    "melodic minor": ["minor", "minor", "major", "major", "major", "major", "major"],
    "dorian": ["minor", "minor", "major", "major", "minor", "diminished", "major"],
    "phrygian": ["minor", "major", "major", "minor", "diminished", "major", "minor"],
    "lydian": ["major", "major", "minor", "diminished", "major", "minor", "minor"],
    "mixolydian": ["major", "minor", "diminished", "major", "minor", "major", "major"],
    "locrian": ["diminished", "major", "minor", "minor", "major", "major", "minor"]
};

/*
    Az első akkord mindig a tonika.
    A random 
*/

const randNum = (from, to) => Math.floor(Math.random()* ((to - from)+1)) + from;

function createChordProgression(sadCheerful, mysteriousMundane, tenseCalm, simpleComplex) {
    // Segédfüggvény: eltérés kiszámítása két pontkészlet között
    function calculateDeviation(target, source) {
        return Math.abs(target["sad-cheerful"] - source["sad-cheerful"]) +
               Math.abs(target["mysterious-mundane"] - source["mysterious-mundane"]) +
               Math.abs(target["tense-calm"] - source["tense-calm"]);
    }

    // Segédfüggvény: akkord lekérdezése fok szerint
    function getChordByDegree(degree) {
        const type = chordTypes[degree - 1];
        return { index: degree, notes: diatonicChords[degree - 1], type: type };
    }

    // 1. Skála kiválasztása valószínűség alapján
    const scaleProbabilities = {};
    const targetMood = { "sad-cheerful": sadCheerful, "mysterious-mundane": mysteriousMundane, "tense-calm": tenseCalm };

    for (const scale of Object.keys(scalePoints)) {
        const deviation = calculateDeviation(targetMood, scalePoints[scale]);
        const probability = 1 - (deviation / 30);
        scaleProbabilities[scale] = probability;
    }

    // A három legnagyobb valószínűségű skála kiválasztása
    const sortedScales = Object.entries(scaleProbabilities)
        .sort(([, probA], [, probB]) => probB - probA)
        .slice(0, 3);


    // Véletlenszerű választás a top 3 skála közül
    const selectedScale = sortedScales[Math.floor(Math.random() * 3)][0];

    // 2. Diatonikus akkordok meghatározása (triádok, C kulcsban)
    const diatonicChords = getDiatonicChords("C", selectedScale, "triad");
    const chordTypes = scaleChords[selectedScale];

    // 3. Akkordok csoportosítása típus szerint
    const chordsByType = { major: [], minor: [], diminished: [] };

    for (let i = 0; i < diatonicChords.length; i++) {
        const type = chordTypes[i];
        chordsByType[type].push({ index: i + 1, notes: diatonicChords[i] });
    }

    // 4. Akkordtípus valószínűségek kiszámítása
    const chordTypeProbabilities = {};
    let totalChordDeviation = 0;

    for (const type of Object.keys(chordPoints)) {
        if (chordsByType[type].length > 0) {
            const deviation = calculateDeviation(targetMood, chordPoints[type]);
            const probability = 1 - (deviation / 30);
            chordTypeProbabilities[type] = probability;
            totalChordDeviation += probability;
        }
    }

    // Normalizáljuk a valószínűségeket
    for (const type of Object.keys(chordTypeProbabilities)) {
        chordTypeProbabilities[type] /= totalChordDeviation;
    }

    // 5. Pattern meghatározása: 1-2 váltakozás, 2-1 váltakozás vagy csak 1 akkord
    const patternChoice = Math.floor(Math.random() * 3);

    // 6. Akkordprogresszió generálása (8 ütem)
    const progression = [];
    progression[0] = [getChordByDegree(1)];
    let skipTurns = [];

    switch(patternChoice) {
        case 0:
            //minden ütemben egy akkord
            progression[5] = [getChordByDegree(1)];
            progression[7] = [getChordByDegree(1)];
            skipTurns = [0,5,7];
            break;
        case 1:
            //2,1,2,1 akkordok
            progression[0].push(getChordByDegree(randNum(2,7)));
            progression[1] = [getChordByDegree(1)];
            progression[5] = [getChordByDegree(1)];
            progression[7] = [getChordByDegree(1)];
            skipTurns = [0,1,5,7];
            break;
        case 2:
            //1,2,1,2 akkordok
            progression[2] = [getChordByDegree(1)];
            skipTurns = [0,2];
            break;
    }

    let previousChordDegree = 0;

    for(let i = 0; i < 8; i++) {
        if(skipTurns.includes(i)) continue;

        const measure = [];
        let chordDegree = randNum(2,7);
        
        while(chordDegree === previousChordDegree) {
            chordDegree = randNum(2,7);
        }

        measure.push(getChordByDegree(chordDegree));

        if([1,2].includes(patternChoice)) {
            chordDegree = randNum(2,7);

            while(chordDegree === previousChordDegree) {
                chordDegree = randNum(2,7);
            }

            previousChordDegree = chordDegree;
        }

        if((i+1)%2 === 1 && patternChoice === 1) {
            measure.push(getChordByDegree(chordDegree));
        } else if(patternChoice === 2 && (i+1)%2 === 0) {
            measure.push(getChordByDegree(chordDegree));
        }

        progression[i] = measure;

        previousChordDegree = chordDegree;
    }

    return { scale: selectedScale, progression };
}

const majorKeys = {
    "C": ["C", "D", "E", "F", "G", "A", "B"],
    "G": ["G", "A", "B", "C", "D", "E", "F#"],
    "D": ["D", "E", "F#", "G", "A", "B", "C#"],
    "A": ["A", "B", "C#", "D", "E", "F#", "G#"],
    "E": ["E", "F#", "G#", "A", "B", "C#", "D#"],
    "B": ["B", "C#", "D#", "E", "F#", "G#", "A#"],
    "F#": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
    "C#": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
    "F": ["F", "G", "A", "Bb", "C", "D", "E"],
    "Bb": ["Bb", "C", "D", "Eb", "F", "G", "A"],
    "Eb": ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
    "Ab": ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
    "Db": ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
    "Gb": ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
    "Cb": ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"]
};

const chromatic = {
    "C": ["Cb", "C", "C#"],
    "D": ["Db", "D", "D#"],
    "E": ["Eb", "E", "E#"],
    "F": ["Fb", "F", "F#"],
    "G": ["Gb", "G", "G#"],
    "A": ["Ab", "A", "A#"],
    "B": ["Bb", "B", "B#"]
};

// Segédfüggvény: élesítés (pl. F -> F#, Bb -> B, E -> E#)
function sharpen(note) {
    const letter = note[0];
    const variations = chromatic[letter];
    const idx = variations.indexOf(note);
    return variations[idx + 1] || note;
}

// Segédfüggvény: minor flatten
function flatten(note) {
    const letter = note[0];
    const variations = chromatic[letter];
    const idx = variations.indexOf(note);
    return variations[idx - 1] || note;
}

function getScaleNotes(key, scaleType) {
    let scaleNotes = [];
    let noteShift = 0;

    if (scaleType === "major") {
        return majorKeys[key];
    }

    switch (scaleType) {
        case "dorian":
            noteShift = 1;
            break;
        case "phrygian":
            noteShift = 2;
            break;
        case "lydian":
            noteShift = 3;
            break;
        case "mixolydian":
            noteShift = 4;
            break;
        case "locrian":
            noteShift = 6;
            break;
        default:
            // aeolian / minor alap
            noteShift = 5;
            break;
    }

    let baseKey = "";

    for (let startNote of Object.keys(majorKeys)) {
        const noteIndex = majorKeys[startNote].findIndex(note => note === key);
        if (noteIndex === noteShift) {
            baseKey = startNote;
            break;
        }
    }

    scaleNotes = majorKeys[baseKey];
    const modeNotes = [];

    for (let i = noteShift; i < noteShift + 7; i++) {
        modeNotes.push(scaleNotes[i % 7]);
    }

    // Speciális minor módosítások
    if (scaleType === "harmonic minor") {
        // 7. fok emelése
        let seventh = modeNotes[6];
        modeNotes[6] = sharpen(seventh);
    }

    if (scaleType === "melodic minor") {
        // 6. és 7. fok emelése
        let sixth = modeNotes[5];
        let seventh = modeNotes[6];
        modeNotes[5] = sharpen(sixth);
        modeNotes[6] = sharpen(seventh);
    }

    return modeNotes;
}

function getDiatonicChords(key, scaleType, chordType) {
    // Mindig natural minor skálát használunk minor esetén
    let minorType = scaleType;
    if (scaleType === "harmonic minor" || scaleType === "melodic minor") {
        minorType = "natural minor";
    }

    const scaleNotes = getScaleNotes(key, minorType);
    const chords = [];
    let chordLength = 3;

    if (chordType === "seventh") chordLength = 4;
    else if (chordType === "ninth") chordLength = 5;

    for (let i = 0; i < scaleNotes.length; i++) {
        const chord = [];
        for (let j = 0; j < chordLength; j++) {
            const noteIndex = (i + j * 2) % scaleNotes.length;
            chord.push(scaleNotes[noteIndex]);
        }
        chords.push(chord);
    }

    // Minor speciális módosítások
    if (scaleType === "harmonic minor") {
        // V. fok (index 4) major lesz
        const chord = chords[4];
        chord[1] = sharpen(chord[1]); // Third élesítése
    }

    if (scaleType === "melodic minor") {
        // IV. és V. fok (index 3 és 4) major lesz
        for (let idx of [3, 4]) {
            const chord = chords[idx];
            chord[1] = sharpen(chord[1]); // Third élesítése
        }
    }

    return chords;
}


function getSecondaryDominants(diatonicChords, scaleType = "major") {
    const result = [];

    if (scaleType === "major") {
        // II. fok (index 1)
        const chordII = [...diatonicChords[1]];
        chordII[1] = sharpen(chordII[1]); // Third élesítése
        result.push(chordII);

        // III. fok (index 2)
        const chordIII = [...diatonicChords[2]];
        chordIII[1] = sharpen(chordIII[1]); // Third élesítése
        result.push(chordIII);

        // VI. fok (index 5)
        const chordVI = [...diatonicChords[5]];
        chordVI[1] = sharpen(chordVI[1]); // Third élesítése
        result.push(chordVI);

        // VII. fok (index 6, diminished)
        const chordVII = [...diatonicChords[6]];
        chordVII[1] = sharpen(chordVII[1]); // Third élesítése
        chordVII[2] = sharpen(chordVII[2]); // Fifth élesítése
        result.push(chordVII);
    } else {
        // VI. fok (index 5)
        const chordVI = [...diatonicChords[5]];
        chordVI[1] = flatten(chordVI[1]); // Third leengedése
        result.push(chordVI);

        // VII. fok (index 6)
        const chordVII = [...diatonicChords[6]];
        chordVII[1] = flatten(chordVII[1]); // Third leengedése
        result.push(chordVII);

        // II. fok (index 1, diminished)
        const chordII = [...diatonicChords[1]];
        chordII[2] = flatten(chordII[2]); // Fifth leengedése
        result.push(chordII);

        // III. fok (index 2)
        const chordIII = [...diatonicChords[2]];
        chordIII[1] = flatten(chordIII[1]); // Third leengedése
        result.push(chordIII);
    }

    return result;
}

function getSecondaryLeadingTones(diatonicChords, scaleType = "major") {
    const result = [];

    if (scaleType === "major") {
        // Target ii (index 1): C# dim, C#dim7, C#m7b5
        const chord1_dim = [sharpen(diatonicChords[0][0]), diatonicChords[2][0], diatonicChords[4][0]];
        const chord1_dim7 = [sharpen(diatonicChords[0][0]), diatonicChords[2][0], diatonicChords[4][0], flatten(diatonicChords[6][0])];
        const chord1_halfdim = [sharpen(diatonicChords[0][0]), diatonicChords[2][0], diatonicChords[4][0], diatonicChords[6][0]];
        result.push(chord1_dim, chord1_dim7, chord1_halfdim);

        // Target iii (index 2): D# dim, D#dim7, D#m7b5
        const chord2_dim = [sharpen(diatonicChords[1][0]), sharpen(diatonicChords[3][0]), diatonicChords[5][0]];
        const chord2_dim7 = [sharpen(diatonicChords[1][0]), sharpen(diatonicChords[3][0]), diatonicChords[5][0], diatonicChords[0][0]];
        const chord2_halfdim = [sharpen(diatonicChords[1][0]), sharpen(diatonicChords[3][0]), diatonicChords[5][0], sharpen(diatonicChords[0][0])];
        result.push(chord2_dim, chord2_dim7, chord2_halfdim);

        // Target IV (index 3): E dim, Edim7, Em7b5
        const chord3_dim = [diatonicChords[2][0], diatonicChords[4][0], flatten(diatonicChords[6][0])];
        const chord3_dim7 = [diatonicChords[2][0], diatonicChords[4][0], flatten(diatonicChords[6][0]), flatten(diatonicChords[1][0])];
        const chord3_halfdim = [diatonicChords[2][0], diatonicChords[4][0], flatten(diatonicChords[6][0]), diatonicChords[1][0]];
        result.push(chord3_dim, chord3_dim7, chord3_halfdim);

        // Target V (index 4): F# dim, F#dim7, F#m7b5
        const chord4_dim = [sharpen(diatonicChords[3][0]), diatonicChords[5][0], diatonicChords[0][0]];
        const chord4_dim7 = [sharpen(diatonicChords[3][0]), diatonicChords[5][0], diatonicChords[0][0], flatten(diatonicChords[2][0])];
        const chord4_halfdim = [sharpen(diatonicChords[3][0]), diatonicChords[5][0], diatonicChords[0][0], diatonicChords[2][0]];
        result.push(chord4_dim, chord4_dim7, chord4_halfdim);

        // Target vi (index 5): G# dim, G#dim7, G#m7b5
        const chord5_dim = [sharpen(diatonicChords[4][0]), diatonicChords[6][0], diatonicChords[1][0]];
        const chord5_dim7 = [sharpen(diatonicChords[4][0]), diatonicChords[6][0], diatonicChords[1][0], diatonicChords[3][0]];
        const chord5_halfdim = [sharpen(diatonicChords[4][0]), diatonicChords[6][0], diatonicChords[1][0], sharpen(diatonicChords[3][0])];
        result.push(chord5_dim, chord5_dim7, chord5_halfdim);
    } else {
        // Target III (index 2): B dim, Bdim7, Bm7b5
        const chord1_dim = [diatonicChords[1][0], diatonicChords[3][0], diatonicChords[5][0]];
        const chord1_dim7 = [diatonicChords[1][0], diatonicChords[3][0], diatonicChords[5][0], flatten(diatonicChords[0][0])];
        const chord1_halfdim = [diatonicChords[1][0], diatonicChords[3][0], diatonicChords[5][0], diatonicChords[0][0]];
        result.push(chord1_dim, chord1_dim7, chord1_halfdim);

        // Target iv (index 3): C# dim, C#dim7, C#m7b5
        const chord2_dim = [sharpen(diatonicChords[2][0]), diatonicChords[4][0], flatten(diatonicChords[6][0])];
        const chord2_dim7 = [sharpen(diatonicChords[2][0]), diatonicChords[4][0], flatten(diatonicChords[6][0]), flatten(diatonicChords[1][0])];
        const chord2_halfdim = [sharpen(diatonicChords[2][0]), diatonicChords[4][0], flatten(diatonicChords[6][0]), diatonicChords[1][0]];
        result.push(chord2_dim, chord2_dim7, chord2_halfdim);

        // Target v (index 4): D# dim, D#dim7, D#m7b5
        const chord3_dim = [sharpen(diatonicChords[3][0]), sharpen(diatonicChords[5][0]), diatonicChords[0][0]];
        const chord3_dim7 = [sharpen(diatonicChords[3][0]), sharpen(diatonicChords[5][0]), diatonicChords[0][0], diatonicChords[2][0]];
        const chord3_halfdim = [sharpen(diatonicChords[3][0]), sharpen(diatonicChords[5][0]), diatonicChords[0][0], sharpen(diatonicChords[2][0])];
        result.push(chord3_dim, chord3_dim7, chord3_halfdim);

        // Target VI (index 5): E dim, Edim7, Em7b5
        const chord4_dim = [diatonicChords[4][0], diatonicChords[6][0], flatten(diatonicChords[1][0])];
        const chord4_dim7 = [diatonicChords[4][0], diatonicChords[6][0], flatten(diatonicChords[1][0]), flatten(diatonicChords[3][0])];
        const chord4_halfdim = [diatonicChords[4][0], diatonicChords[6][0], flatten(diatonicChords[1][0]), diatonicChords[3][0]];
        result.push(chord4_dim, chord4_dim7, chord4_halfdim);

        // Target VII (index 6): F# dim, F#dim7, F#m7b5
        const chord5_dim = [sharpen(diatonicChords[5][0]), diatonicChords[0][0], diatonicChords[2][0]];
        const chord5_dim7 = [sharpen(diatonicChords[5][0]), diatonicChords[0][0], diatonicChords[2][0], flatten(diatonicChords[4][0])];
        const chord5_halfdim = [sharpen(diatonicChords[5][0]), diatonicChords[0][0], diatonicChords[2][0], diatonicChords[4][0]];
        result.push(chord5_dim, chord5_dim7, chord5_halfdim);
    }

    return result;
}

function getChromaticMediants(diatonicChords, scaleType = "major", chordType = "triad") {
    const result = [];
    let chordLength = 3;

    if (chordType === "seventh") {
        chordLength = 4;
    } else if (chordType === "ninth") {
        chordLength = 5;
    }

    if (scaleType === "major") {
        // III. fok (index 2): E minor -> E major, Ab major, Ab minor
        const chordIII_major = [...diatonicChords[2].slice(0, 3)]; // Alap triád
        chordIII_major[1] = sharpen(chordIII_major[1]); // Third élesítése
        if (chordLength > 3) chordIII_major.push(diatonicChords[2][3]); // Seventh hozzáadása
        if (chordLength > 4) chordIII_major.push(diatonicChords[2][4]); // Ninth hozzáadása
        result.push(chordIII_major); // E major

        const chordIII_flat_major = [flatten(diatonicChords[5][0]), diatonicChords[0][0], flatten(diatonicChords[2][0])];
        if (chordLength > 3) chordIII_flat_major.push(diatonicChords[5][3]); // Seventh hozzáadása
        if (chordLength > 4) chordIII_flat_major.push(diatonicChords[5][4]); // Ninth hozzáadása
        result.push(chordIII_flat_major); // Ab major

        const chordIII_flat_minor = [flatten(diatonicChords[5][0]), flatten(diatonicChords[0][0]), flatten(diatonicChords[2][0])];
        if (chordLength > 3) chordIII_flat_minor.push(diatonicChords[5][3]); // Seventh hozzáadása
        if (chordLength > 4) chordIII_flat_minor.push(diatonicChords[5][4]); // Ninth hozzáadása
        result.push(chordIII_flat_minor); // Ab minor

        // VI. fok (index 5): A minor -> A major, Eb major, Eb minor
        const chordVI_major = [...diatonicChords[5].slice(0, 3)];
        chordVI_major[1] = sharpen(chordVI_major[1]); // Third élesítése
        if (chordLength > 3) chordVI_major.push(diatonicChords[5][3]); // Seventh hozzáadása
        if (chordLength > 4) chordVI_major.push(diatonicChords[5][4]); // Ninth hozzáadása
        result.push(chordVI_major); // A major

        const chordVI_flat_major = [flatten(diatonicChords[2][0]), diatonicChords[4][0], flatten(diatonicChords[6][0])];
        if (chordLength > 3) chordVI_flat_major.push(diatonicChords[2][3]); // Seventh hozzáadása
        if (chordLength > 4) chordVI_flat_major.push(diatonicChords[2][4]); // Ninth hozzáadása
        result.push(chordVI_flat_major); // Eb major

        const chordVI_flat_minor = [flatten(diatonicChords[2][0]), flatten(diatonicChords[4][0]), flatten(diatonicChords[6][0])];
        if (chordLength > 3) chordVI_flat_minor.push(diatonicChords[2][3]); // Seventh hozzáadása
        if (chordLength > 4) chordVI_flat_minor.push(diatonicChords[2][4]); // Ninth hozzáadása
        result.push(chordVI_flat_minor); // Eb minor
    } else {
        // III. fok (index 2): C major -> C minor
        const chordIII_minor = [...diatonicChords[2].slice(0, 3)];
        chordIII_minor[1] = flatten(chordIII_minor[1]); // Third leengedése
        if (chordLength > 3) chordIII_minor.push(diatonicChords[2][3]); // Seventh hozzáadása
        if (chordLength > 4) chordIII_minor.push(diatonicChords[2][4]); // Ninth hozzáadása
        result.push(chordIII_minor); // C minor

        // VI. fok (index 5): F major -> F minor
        const chordVI_minor = [...diatonicChords[5].slice(0, 3)];
        chordVI_minor[1] = flatten(chordVI_minor[1]); // Third leengedése
        if (chordLength > 3) chordVI_minor.push(diatonicChords[5][3]); // Seventh hozzáadása
        if (chordLength > 4) chordVI_minor.push(diatonicChords[5][4]); // Ninth hozzáadása
        result.push(chordVI_minor); // F minor
    }

    return result;
}

const progression = createChordProgression(2, 5, -3, 1);
console.log(progression.scale);

for(let chord of progression.progression) {
    console.log(chord);
}

generateMidiFromProgression(progression, 'chord_progression.mid');