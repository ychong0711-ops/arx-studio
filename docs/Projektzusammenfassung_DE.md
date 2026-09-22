# Projektzusammenfassung — ARX Studio
### AUTOSAR-Classic-Authoring-Tool (Contract-Phase) — einseitige Bewerbungsübersicht

> **Kurzprofil:** Web-basiertes Modellierungs- und Generierungswerkzeug für die
> Architekturphase (Contract-Phase) von AUTOSAR-Classic-ECU-Software.
> Modellierung von Software-Komponenten, Port-Schnittstellen, Runnables und
> Assembly-Connectoren → sprachgesicherter ARXML-Export (R20-11 … R24-11) +
> kompilierbarer RTE-Vertragscode (C).

---

#### 1. Problem (Ausgangssituation)

Die Architekturphase von Fahrzeugsoftware beginnt lange vor der Implementierung:
Komponenten, Schnittstellen und deren Verschaltung („Virtual Functional Bus“)
werden als AUTOSAR-Modell (ARXML) spezifiziert. Diese Phase ist fehleranfällig —
unstimmige Referenzen, ungültige Namen oder falsche Schemaversionen führen erst
in der Integration (DaVinci, ISOLAR) zu Fehlern. Für Studierende/Entwickler gibt
es zudem kaum ein zugängliches, kostenfreies Werkzeug, um den Standard zu lernen
und eigene Modelle reproduzierbar zu erzeugen.

#### 2. Lösung (Ansatz)

**ARX Studio** erlaubt die grafische Modellierung von SW-Cs, P-/R-Ports,
Sender-Receiver- und Client-Server-Schnittstellen, Datentypen
(Primitive/Array/Record), Runnables (Init/Timing/OperationInvoked) und
Assembly-Connectoren. Daraus werden:
- **ARXML** (Classic Platform, R20-11 … R24-11) erzeugt — **gegen die
  offiziellen AUTOSAR-XSD-Schemata verifiziert** (z. B. R23-11 →
  `AUTOSAR_00052.xsd`, korrekte Element-Strukturen für Array-/Record-Typen),
- **RTE-Vertragscode (C)** — `Std_Types.h`, `Platform_Types.h`, SW-C-Header mit
  `Rte_Read_*/Rte_Write_*/Rte_Call_*` und Runnable-Gerüste,
- ein **Validierungs-Engine**, die Schemaregeln (SHORT-NAME, Duplikate,
  undefinierte Typreferenzen, Port-Richtungen, Interface-Konsistenz) prüft,
- ein **ARXML-Import** für Round-Trip-Workflows (inkl. Composition-SWCs).

#### 3. Methodik (Vorgehen)

1. **Standardanalyse:** Ableitung des Datenmodells und der Emit-Regeln direkt
   aus den AUTOSAR-XSD-Dateien (AUTOSAR_00049–00053) statt aus Beispiel-Code.
2. **Design:** Trennung von puren Generatoren (`arxml.ts`, `rte.ts`,
   `validation.ts`) und Datenzugriff (Drizzle/PostgreSQL) — testbar ohne
   Datenbank.
3. **Implementierung:** Next.js/React (Server Actions), React-Flow-Topologie,
   ARRAY/STRUCTURE-Datentypen, Compiler-fähige C-Generierung.
4. **Verifikation:** 27 automatisierte Unit-Tests (XML-Wohlgeformtheit,
   Schema-Zuordnung, Element-Strukturen, C-Erzeugung), `tsc`/ESLint clean,
   **Host-C-Build** mit `-Wall -Wextra -Werror` (gcc/clang), CI-Pipeline.
5. **Anwendung:** Demo-Modell „Adaptive Cruise Control“ (ACC) inkl. STM32/CANBeispiel, das die erzeugte RTE-API in einer geschlossenen Regelstrecke nutzt.

#### 4. Technik & Fakten

| Bereich | Details |
|---|---|
| Sprachen/Framework | TypeScript (strict), C (C99, AUTOSAR-Typen), Next.js 16, React 19 |
| Datenhaltung | PostgreSQL, Drizzle ORM |
| Tests/Qualität | 27 Vitest-Tests, `tsc`/ESLint ohne Befunde, CI (GitHub Actions) |
| Kompetenznachweis | XSD-verifizierter ARXML-Export; kompilierter RTE-Vertragscode; CAN-Demo |

#### 5. Bezug zur Embedded-Automotive-Praxis

- Verständnis des **AUTOSAR-Classic-Metamodells** (SW-C, Port-Interfaces,
  Runnables, Assembly-Connectors, Daten-/Implementierungstypen).
- **Tool-Kette-Denken:** Modell → ARXML → Import in Branchenwerkzeuge →
  RTE-Vertrag → Implementierung (Contract-Phase-Workflow).
- **C-Code-Generierung** mit AUTOSAR-Typen (`Std_ReturnType`, `boolean`,
  Portablen Plattform-Typen) und Demonstrationsprojekt auf CAN-Bus-Ebene.

---

*Einseitige Kurzfassung in deutscher Sprache. Erstellt aus dem Projektstand
„ARX Studio“ (AUTOSAR Classic Authoring Tool).*