const privacyPolicyNo = `1. Formål og omfang

Disse retningslinjene definerer det regulatoriske, tekniske og operasjonelle rammeverket for sikker håndtering, behandling og lagring av kliniske data i PneumOrpheus-systemet for datamaskinassistert diagnostikk (CAD). PneumOrpheus er primært utviklet for automatisert histologisk klassifisering og stadieinndeling av lungekreft. Systemet opererer med en frikoblet arkitektur i flere lag distribuert på skyplattformen Microsoft Azure, og er designet for sømløs samhandling med sykehusenes bildearkiverings- og kommunikasjonssystemer (PACS), spesifikt Sectra IDS7-miljøet. Disse retningslinjene gjelder for alle instanser av systemet, og regulerer all interaksjon utført av kliniske brukere, systemadministratorer og tredjeparts behandlingsmoduler.

2. Rettslig grunnlag og etterlevelsesrammeverk

PneumOrpheus behandler medisinske bildedata og pasientdemografi, noe som utgjør «særlige kategorier av personopplysninger» under artikkel 9 i EUs generelle personvernforordning (GDPR). Databehandlingen i systemet er strengt regulert av følgende juridiske og etiske rammeverk:

GDPR artikkel 6 og 9:
Behandling er kun tillatt når den er forankret i et eksplisitt, frivillig, spesifikt, informert og dokumentert pasientsamtykke, eller under strenge unntak for folkehelse og medisinsk diagnostikk i samsvar med GDPR artikkel 9 nr. 2 bokstav h.

Den norske «Normen»:
Tekniske implementeringer følger kravene i Norm for informasjonssikkerhet og personvern i helse- og omsorgstjenesten (Normen). Dette sikrer at skybasert databehandling er i samsvar med nasjonale terskler for kryptografi og risikostyring.

Vurdering av personvernkonsekvenser (DPIA):
Kontinuerlig etterlevelse opprettholdes gjennom regelmessige DPIA-er for å evaluere nødvendigheten av, og risikoreduserende tiltak for, maskinlæringsinferens, journalføring og rapporteringsfunksjoner.

3. Datataksonomi og protokoller for dataminimering

I samsvar med GDPR-prinsippet om dataminimering begrenser PneumOrpheus datainnsamlingen til de strengt nødvendige komponentene som kreves for å fullføre oppgavene knyttet til diagnostisk klassifisering og stadieinndeling. Systemet håndterer tre distinkte datakategorier:

Volumetriske bildedata:
Rå DICOM-filer (Digital Imaging and Communications in Medicine) som lastes opp via brukergrensesnittet. Disse konverteres automatisk via en MONAI-basert preprosesseringspipeline til NIfTI-format (Neuroimaging Informatics Technology Initiative) for å sikre isotropisk vokselsoneavstand og konsistente koordinatsystemer, samt for å fjerne ikke-essensielle metadata.

Pasientmetadata:
Begrenset til ikke-identifiserbare kliniske parametere som er relevante for lungekreftsubtyping. Direkte identifikatorer renses fullstendig eller pseudonymiseres på sykehusets klientside før overføring til skyen.

Diagnostiske utdata og artefakter:
Beregnede utdata generert av modellen(e), inkludert en ternær histologisk sannsynlighetsdistribusjon, 3D-koordinater for avgrensende bokser for lymfeknutestasjoner, samt post-hoc ressurser for forklarbar kunstig intelligens (XAI), slik som Grad-CAM++ varmekart for romlig oppmerksomhet.

4. Arkitektonisk sikkerhet og beskyttelse av dataflyt

Arkitekturen implementerer et strengt skille mellom ansvarsområder for å ivareta dataintegritet og konfidensialitet under tungberegningsprosesser for dyplæringsinferens:

Data under overføring:
All kommunikasjon mellom presentasjonslaget og serverlaget krypteres ved bruk av Transport Layer Security (TLS 1.3)-protokoller.

Lagrede data:
Store binære objekter, inkludert de strukturelle 3D NIfTI-volumene og de genererte Grad-CAM++-aktiveringskartene, lagres eksternt i et sikret Azure Blob Storage i skyen. Disse krypteres med Advanced Encryption Standard med 256-biters nøkler (AES-256). Systemets relasjonelle database oppbevarer kun de relative URL-stiene og serialiserte skjemaer for diagnostiske metadata, noe som forhindrer eksponering av rå bildefiler gjennom det relasjonelle databaselaget.

Serverløs isolasjon:
Modellinferens kjøres i containeriserte Docker-miljøer administrert av Azure Container Apps. Disse miljøene benytter en «skaler-til-null»-orkestrering, som sikrer at instanser som holder aktive pasientdatatokens blir fullstendig terminert og slettet fra flyktig minne så snart aktive prosesseringsjobber er fullført.

5. Tilgangskontroll og avdelingsstyring

For å beskytte mot uautorisert sirkulasjon eller utnyttelse av sensitive medisinske data, håndheves strenge tiltak for identitetsstyring og tilgangskontroll:

Autentisering og MFA:
Identitetsstyring formidles gjennom Supabases autentiseringslag, som krever obligatorisk flerfaktorautentisering (MFA) via unike bruker-ID-er og tokens for alle kliniske brukere.

Sikkerhet på radnivå:
Den underliggende databasen implementerer strenge RLS-regler. RLS filtrerer databaseforespørsler dynamisk basert på klinikerens autentisering. Dette garanterer at en radiolog fra et spesifikt helseforetak kun kan se eller samhandle med undersøkelser som tilhører deres eget tilgangsdomene.

Rollebasert tilgangskontroll:
Rettigheter er segmentert i eksplisitte roller. Kun autoriserte tolkende radiologer har kryptografiske rettigheter til å modifisere segmenterte regioner av interesse eller overstyre de automatiserte diagnostiske rapportene.

6. Uforanderlig revisjonslogging og sporbarhet

For å sikre ansvarlighet og støtte regulatoriske samsvarsrevisjoner, opprettholder PneumOrpheus en uavhengig, uforanderlig revisjonslogg som registrerer enhver interaksjon i applikasjonens økosystem:

Loggdekning:
Systemet registrerer en detaljert telemetrihendelse for alle brukerhandlinger, inkludert brukerautentisering, opplasting av bilder, datakonverteringer, kall til modellinferens, rapportendringer, visning av visuelle varmekart og forespørsler om sletting av data.

Loggstruktur:
Hver logginnføring inneholder en kryptografisk sammenkoblet post med nøyaktig UTC-tidsstempel, unik bruker-ID, anonymisert pasient-/analyse-ID, den spesifikke handlingen som ble utført, samt systemkomponenten handlingen oppstod fra.

Loggbevaring:
Revisjonsloggene er frikoblet fra det operasjonelle applikasjonslaget og lagres i en skrivebeskyttet loggbøtte, noe som beskytter sporbarheten mot intern manipulering eller administrativ overstyring.

7. Pasientrettigheter, lagring og retten til sletting

Systemet respekterer de krav til personopplysningssuverenitet som kreves av moderne personvernforordninger:

Retten til tilbaketrekking og sletting:
I samsvar med GDPR artikkel 17 har pasienter rett til å trekke tilbake sitt samtykke til databehandling når som helst. PneumOrpheus oppfordrer alle brukere av systemet til å respektere disse rettighetene i behandling av data som benyttes i bruk med systemet, og dersom analyse- og/eller pasientdata slettes via den kliniske portalen, utfører plattformen en kaskadesletting: de rå og preprosesserte volumene slettes permanent fra sikret skylagring, og tilhørende rader slettes fra databasen.

Forbud mot gjenbruk til trening:
Kliniske skanninger som samles inn for rutinemessig diagnostisk beslutningsstøtte blir aldri automatisk matet tilbake i treningssløyfer eller brukt til modelloptimalisering uten et eget, frittstående og eksplisitt samtykke. Dette skillet blokkerer enhver implisitt lekkasje av pasientspesifikke kjennetegn gjennom oppdatering av dyplæringsmodellens vekter.`;

export default privacyPolicyNo;
