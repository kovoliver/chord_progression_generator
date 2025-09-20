// import
import MidiWriter from 'midi-writer-js';
import { writeFile } from 'fs/promises';

export default async function generateMidiFromProgression(
    progressionObj,
    outputFile = 'output.mid',
    // ha más a TPQN-öd, állítsd át (lásd lejjebb hogyan ellenőrizd)
    TICKS_PER_QUARTER = 128
) {
    const track = new MidiWriter.Track();

    // 1) meta események: tempo és metrika (kezdő tick = 0)
    track.setTempo(120, 0);                  // setTempo(bpm, tick) — tick alapból 0. :contentReference[oaicite:1]{index=1}
    track.setTimeSignature(4, 4);            // egyszerű helper a TimeSignature eseményhez

    // 2) program change (instrument) — tegyük explicit a 0. tickre, csatorna = 1 (MidiWriterJS 1-alapú). :contentReference[oaicite:2]{index=2}
    const pc = new MidiWriter.ProgramChangeEvent({ instrument: 1 });
    pc.tick = 0;
    pc.channel = 1; // MidiWriterJS csatornák 1..16
    track.addEvent(pc);

    const beatsPerMeasure = 4;
    const ticksPerMeasure = beatsPerMeasure * TICKS_PER_QUARTER;

    // helper: helyes pitch-formátum (C4, Eb4, stb.) és validálás
    function normalizePitch(note) {
        // ha 'C' vagy 'Eb' formátumban van (nincs oktáv), tegyük hozzá a 4-es oktávot
        if (/^[A-G][b#]?$/.test(note)) return `${note}4`;
        // ha már tartalmaz számot, ellenőrizzük
        if (/^[A-G][b#]?\d$/.test(note)) return note;
        // ha semmi, dobjunk figyelmeztetést és default C4
        console.warn(`Invalid note string "${note}", defaulting to C4`);
        return 'C4';
    }

    // helper: duration string -> beats (csak '1' és '2' szükséges a te logikához)
    function durationToBeats(d) {
        if (d === '1') return 4;
        if (d === '2') return 2;
        // ha esetleg más típus jön (ritkán), próbáljuk értelmezni alap értékekkel:
        if (d === '4') return 1;
        if (d === '8') return 0.5;
        return 0; // védelmi fallback
    }

    // bejárjuk a progressionObj.progression-t — minden measure egy tömb akkordokkal
    progressionObj.progression.forEach((measure, measureIndex) => {
        // ha üres measure (nincs akkord), kihagyjuk
        if (!measure || measure.length === 0) return;

        // measure belső pointer a kezdő beathez (akkor lesz 0, majd növeljük)
        let measureBeatPointer = 0;

        // először kiszámoljuk a pattern alapján a durációkat (a korábbi logikádat megtartjuk)
        // (ez egyszerűen lehet inline is, itt áttekinthetőség miatt)
        const chordCount = measure.length;

        measure.forEach((chord, chordIndex) => {
            // determine duration string (az eredeti logikád alapján)
            // feltételezzük, hogy progressionObj korábban pattern szerint van összeállítva
            // ha a te kódodba beépített logikát akarod, másold be ide; alább egyszerű változat:
            let duration = '2'; // default half
            // ha csak egy akkord van a measure-ben, legyen whole
            if (chordCount === 1) duration = '1';
            // ha két akkord van: a te szabályaid szerint az elhelyezés határozza meg a durációt
            else if (chordCount === 2) {
                // ha az első akkordnak kell nagyobbnak lennie, stb. — a te eredeti logikádat használhatod
                // egyszerű példa: az első fél akkord, a második fél
                duration = '2';
            }

            // normalizáljuk a pitch-eket és ellenőrizzük
            const midiPitches = chord.notes.map(n => normalizePitch(String(n)));

            // számoljuk ki az abszolút tick-et: measureStart + measureBeatPointer * TICKS_PER_QUARTER
            const measureStartTick = measureIndex * ticksPerMeasure;
            const startTick = measureStartTick + Math.round(measureBeatPointer * TICKS_PER_QUARTER);

            // készítjük az NoteEvent-et explicit tick-kel (így nem függünk implicit deltaszámlálástól)
            const noteEvent = new MidiWriter.NoteEvent({
                pitch: midiPitches,
                duration: duration,
                velocity: 100,
                tick: startTick,    // abszolút elhelyezés a track-en
                wait: '0',          // ne tegyen extra rest-et az esemény elé (alapértelmezés 0 egyébként). :contentReference[oaicite:3]{index=3}
                sequential: false,
                channel: 1          // csatorna 1..16 (MidiWriterJS konvenció)
            });

            track.addEvent(noteEvent);

            // léptetjük a measure pointert a jelen akkord hosszával (behatárolva)
            measureBeatPointer += durationToBeats(duration);
        });
    });

    // Writer és fájlírás
    const writer = new MidiWriter.Writer([track]);
    const midiData = writer.buildFile(); // Uint8Array

    try {
        await writeFile(outputFile, Buffer.from(midiData));
        console.log(`MIDI file saved as ${outputFile}`);
    } catch (err) {
        console.error('Error writing MIDI file:', err);
        throw err;
    }
}