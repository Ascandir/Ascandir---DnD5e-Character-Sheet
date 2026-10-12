import { FLAG_PLAYER_EDIT, MODULE_ID, ORIGIN_TYPES, SETTINGS, TEMPLATE_PATH } from "./constants.mjs";
import { applyTheme, getActiveTheme } from "./themes.mjs";

/**
 * Tabs dieses Bogens in Anzeigereihenfolge. Tabs, die das System oder andere Module zusätzlich
 * am Standardbogen registrieren (Bastion, Spezial, Tabs anderer Module ...), werden hinten angehängt.
 */
const OWN_TABS = [
  { tab: "overview", label: "ASCSHEET.Tab.overview", icon: "fa-solid fa-house-chimney" },
  { tab: "details", label: "ASCSHEET.Tab.details", icon: "fa-solid fa-dice-d20" },
  { tab: "features", label: "ASCSHEET.Tab.features", icon: "fa-solid fa-scroll" },
  { tab: "combat", label: "ASCSHEET.Tab.combat", icon: "fa-solid fa-khanda" },
  { tab: "spells", label: "ASCSHEET.Tab.spells", icon: "fa-solid fa-wand-sparkles" },
  { tab: "inventory", label: "ASCSHEET.Tab.inventory", icon: "fa-solid fa-sack-dollar" },
  { tab: "effects", label: "ASCSHEET.Tab.effects", icon: "fa-solid fa-bolt" },
  { tab: "biography", label: "ASCSHEET.Tab.biography", icon: "fa-solid fa-feather-pointed" }
];

/** Teile des Standardbogens, die durch eigene ersetzt bzw. nicht gebraucht werden. */
const REPLACED_PARTS = new Set(["header", "sidebar", "abilityScores", "tabs"]);

/** Symbole für die Attributskarten. */
const ABILITY_ICONS = {
  str: "fa-solid fa-hand-fist",
  dex: "fa-solid fa-hand",
  con: "fa-solid fa-heart",
  int: "fa-solid fa-brain",
  wis: "fa-solid fa-eye",
  cha: "fa-solid fa-star"
};

/** Einfarbige Symbole für die Fertigkeiten (wie im Entwurf). */
const SKILL_ICONS = {
  acr: "fa-solid fa-person-running",
  ani: "fa-solid fa-paw",
  arc: "fa-solid fa-hat-wizard",
  ath: "fa-solid fa-dumbbell",
  dec: "fa-solid fa-masks-theater",
  his: "fa-solid fa-book-open",
  ins: "fa-solid fa-lightbulb",
  itm: "fa-solid fa-skull",
  inv: "fa-solid fa-magnifying-glass",
  med: "fa-solid fa-staff-snake",
  nat: "fa-solid fa-leaf",
  prc: "fa-solid fa-eye",
  prf: "fa-solid fa-music",
  per: "fa-solid fa-comments",
  rel: "fa-solid fa-hands-praying",
  slt: "fa-solid fa-hand-sparkles",
  ste: "fa-solid fa-user-ninja",
  sur: "fa-solid fa-compass"
};

/** Design-Raster des Bogens. Alles wird proportional auf die Fenstergröße skaliert. */
const DESIGN = { width: 1270, height: 1240, minZoom: 0.45, maxZoom: 1.6 };

/** Reihenfolge und Beschriftung der Aktionsgruppen im Kampf-Tab. */
const ACTION_GROUPS = ["action", "bonus", "reaction", "other"];

/**
 * Text aus HTML gewinnen (für kurze Vorschauen).
 * @param {string} html
 * @param {number} [max]
 * @returns {string}
 */
function plainText(html, max=90) {
  const div = document.createElement("div");
  div.innerHTML = html ?? "";
  const text = (div.textContent ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/* -------------------------------------------- */

/**
 * Erzeugt die Bogen-Klasse. Muss nach dem Laden des dnd5e-Systems aufgerufen werden (im init-Hook).
 * Der Bogen erweitert den originalen dnd5e-Charakterbogen. Dadurch bleiben alle Aktionen,
 * Drag & Drop, Hooks (renderCharacterActorSheet ...) und Bausteine wie Inventar und Zauberliste erhalten,
 * damit andere Module (Plutonium, Shops, ...) weiterhin andocken können.
 * @returns {typeof dnd5e.applications.actor.CharacterActorSheet}
 */
export function createSheetClass() {
  const Base = dnd5e.applications.actor.CharacterActorSheet;
  const CompendiumBrowser = dnd5e.applications.CompendiumBrowser;

  class AscandirCharacterSheet extends Base {

    /** @override */
    static DEFAULT_OPTIONS = {
      classes: ["ascandir-sheet"],
      position: {
        width: DESIGN.width,
        height: DESIGN.height
      },
      actions: {
        ascToggleSkillFavorite: AscandirCharacterSheet.#toggleSkillFavorite,
        ascSpendSlot: AscandirCharacterSheet.#spendSlot,
        ascClearSearch: AscandirCharacterSheet.#clearSearch,
        findItem: AscandirCharacterSheet.#findItem,
        ascToggleEdit: AscandirCharacterSheet.#toggleEdit,
        ascTogglePlayerEdit: AscandirCharacterSheet.#togglePlayerEdit,
        ascUseItem: AscandirCharacterSheet.#useItem,
        ascShowItem: AscandirCharacterSheet.#showItem,
        ascGoTab: AscandirCharacterSheet.#goTab,
        ascToggleCondition: AscandirCharacterSheet.#toggleCondition,
        ascToggleEquipped: AscandirCharacterSheet.#toggleEquipped
      }
    };

    constructor(options={}) {
      // Startgröße: gespeicherte Größe dieses Bogens oder passend zum Bildschirm im Seitenverhältnis des Entwurfs.
      options.position ??= {};
      const saved = game.user.getFlag(MODULE_ID, "sheetSize") ?? {};
      if ( !("width" in options.position) || !("height" in options.position) ) {
        const maxH = Math.max(600, window.innerHeight - 40);
        const maxW = Math.max(700, window.innerWidth - 40);
        let height = saved.height ?? Math.min(DESIGN.height, maxH);
        let width = saved.width ?? Math.round(height * DESIGN.width / DESIGN.height);
        if ( width > maxW ) {
          width = maxW;
          if ( !saved.height ) height = Math.round(width * DESIGN.height / DESIGN.width);
        }
        options.position.width ??= width;
        options.position.height ??= Math.min(height, maxH);
      }
      super(options);
    }

    /**
     * Gemerkte Suchbegriffe der Suchfelder auf der Übersicht.
     * @type {Record<string, string>}
     */
    _ascSearch = {};

    /* -------------------------------------------- */

    /**
     * Teile des Bogens. Als Getter, damit Teile, die andere Module später am Standardbogen
     * registrieren, automatisch mitkommen.
     * @override
     */
    static get PARTS() {
      const parentParts = Base.PARTS;
      const tabBody = { classes: ["tab-body"], id: "tabs" };
      const parts = {
        header: { template: `${TEMPLATE_PATH}/header.hbs` },
        sidebar: {
          container: { classes: ["main-content"], id: "main" },
          template: `${TEMPLATE_PATH}/sidebar.hbs`
        },
        overview: {
          container: tabBody,
          template: `${TEMPLATE_PATH}/tabs/overview.hbs`,
          scrollable: [""]
        }
      };
      for ( const [id, part] of Object.entries(parentParts) ) {
        if ( REPLACED_PARTS.has(id) || (id === "warnings") ) continue;
        parts[id] = part;
        if ( id === "features" ) parts.combat = {
          container: tabBody,
          template: `${TEMPLATE_PATH}/tabs/combat.hbs`,
          scrollable: [""]
        };
      }
      parts.combat ??= { container: tabBody, template: `${TEMPLATE_PATH}/tabs/combat.hbs`, scrollable: [""] };
      if ( parentParts.warnings ) parts.warnings = parentParts.warnings;
      return parts;
    }

    /* -------------------------------------------- */

    /**
     * Tabs des Bogens, inklusive zusätzlicher Tabs vom System oder anderen Modulen.
     * @override
     */
    static get TABS() {
      const tabs = OWN_TABS.map(t => ({ ...t }));
      for ( const parentTab of Base.TABS ) {
        const own = tabs.find(t => t.tab === parentTab.tab);
        if ( own ) {
          if ( parentTab.condition ) own.condition = parentTab.condition;
        }
        else tabs.push({ ...parentTab });
      }
      return tabs;
    }

    /* -------------------------------------------- */

    /** @override */
    tabGroups = {
      primary: "overview"
    };

    /* -------------------------------------------- */
    /*  Rechte                                      */
    /* -------------------------------------------- */

    /**
     * Darf der aktuelle Benutzer den Bearbeitungsmodus nutzen?
     * SL immer, Spieler nur mit Freigabe vom SL (pro Charakter) oder wenn die Welt-Einstellung es erlaubt.
     * @type {boolean}
     */
    get canEditSheet() {
      if ( !this.isEditable ) return false;
      if ( game.user.isGM ) return true;
      if ( game.settings.get(MODULE_ID, SETTINGS.PLAYER_EDIT) === "always" ) return true;
      return !!this.actor.getFlag(MODULE_ID, FLAG_PLAYER_EDIT);
    }

    /**
     * Darf der Benutzer ein Element vom Typ Klasse/Unterklasse/Spezies/Hintergrund hinzufügen?
     * Ohne Bearbeitungsrecht nur bei der Ersteinrichtung (wenn noch keines vorhanden ist).
     * @param {string} type
     * @returns {boolean}
     */
    canSetupOrigin(type) {
      if ( !this.isEditable ) return false;
      if ( this.canEditSheet ) return true;
      if ( !game.settings.get(MODULE_ID, SETTINGS.PLAYER_SETUP) ) return false;
      switch ( type ) {
        case "class": return !this.actor.itemTypes.class.length;
        case "race": return !this.actor.itemTypes.race.length;
        case "background": return !this.actor.itemTypes.background.length;
        default: return false;
      }
    }

    /* -------------------------------------------- */

    #warnNoRights() {
      ui.notifications.warn(game.i18n.localize("ASCSHEET.Warn.NoEditRights"));
    }

    /* -------------------------------------------- */
    /*  Rendering                                   */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _configureRenderOptions(options) {
      await super._configureRenderOptions(options);
      // Freigabe wurde entzogen: zurück in den Spielmodus.
      if ( this.isEditMode && !this.canEditSheet ) this._mode = this.constructor.MODES.PLAY;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _renderFrame(options) {
      const frame = await super._renderFrame(options);
      frame.classList.remove("vertical-tabs");
      applyTheme(frame, getActiveTheme(this.document));
      return frame;
    }

    /* -------------------------------------------- */

    /**
     * Der Schieberegler im Fensterkopf wird durch den eigenen Bearbeiten-Button ersetzt.
     * @override
     */
    _renderModeToggle() {
      this.element.querySelector(".window-header .mode-slider")?.remove();
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async changeMode(mode) {
      const { MODES } = this.constructor;
      const target = mode ?? (this.isEditMode ? MODES.PLAY : MODES.EDIT);
      if ( (target === MODES.EDIT) && !this.canEditSheet ) return this.#warnNoRights();
      return super.changeMode(target);
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const { itemTypes } = this.actor;
      const hasClass = !!itemTypes.class.length;
      const hasSpecies = !!itemTypes.race.length;
      const hasBackground = !!itemTypes.background.length;
      context.asc = {
        canEdit: this.canEditSheet,
        isGM: game.user.isGM,
        editMode: this.isEditMode,
        playerEditUnlocked: !!this.actor.getFlag(MODULE_ID, FLAG_PLAYER_EDIT),
        playerEditAlways: game.settings.get(MODULE_ID, SETTINGS.PLAYER_EDIT) === "always",
        setup: {
          needed: !hasClass || !hasSpecies || !hasBackground,
          hasClass, hasSpecies, hasBackground,
          canClass: !hasClass && this.canSetupOrigin("class"),
          canSpecies: !hasSpecies && this.canSetupOrigin("race"),
          canBackground: !hasBackground && this.canSetupOrigin("background")
        }
      };
      return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      switch ( partId ) {
        case "header": return this._ascPrepareHeader(context, options);
        case "sidebar": return this._ascPrepareSidebar(context, options);
        case "overview": return this._ascPrepareOverview(context, options);
        case "combat": return this._ascPrepareCombat(context, options);
        default: return context;
      }
    }

    /* -------------------------------------------- */

    /**
     * Kopfzeile: Name, Klassen, Spezies, Tabs.
     * @protected
     */
    async _ascPrepareHeader(context, options) {
      const species = this.actor.system.details.race;
      const nameLength = (this.actor.name ?? "").length;
      context.ascHeader = {
        nameClass: nameLength > 18 ? "asc-name--xlong" : nameLength > 11 ? "asc-name--long" : "",
        species: species instanceof Item ? species.name : null,
        classLabel: context.labels.class || game.i18n.localize("ASCSHEET.NoClass"),
        tabs: Object.values(context.tabs ?? {})
      };
      return context;
    }

    /* -------------------------------------------- */

    /**
     * Seitenleiste: Porträt, Kampfwerte, TP, Spezies & Hintergrund.
     * @protected
     */
    async _ascPrepareSidebar(context, options) {
      const { details } = this.actor.system;
      const species = details.race instanceof Item ? details.race : null;
      const background = details.background instanceof Item ? details.background : null;
      const type = details.type ?? {};
      context.ascSidebar = {
        species,
        background,
        creatureType: type.value === "custom" ? type.custom
          : game.i18n.localize(CONFIG.DND5E.creatureTypes[type.value]?.label ?? ""),
        characteristics: ["alignment", "faith", "age", "gender", "height", "weight", "eyes", "hair", "skin"].map(k => {
          const field = this.actor.system.schema.fields.details.fields[k];
          return {
            key: k,
            name: `system.details.${k}`,
            label: field?.label ?? k,
            value: details[k] ?? ""
          };
        }),
        size: CONFIG.DND5E.actorSizes[this.actor.system.traits.size]?.label ?? this.actor.system.traits.size,
        showDeathSaves: (this.actor.system.attributes.hp.value <= 0) || !!this.actor.system.attributes.death.success
          || !!this.actor.system.attributes.death.failure
      };
      // Leere Favoriten-Kreise, damit immer mindestens vier Ablageplätze sichtbar sind.
      context.ascFavoriteSlots = Array(Math.max(0, 4 - (context.favorites?.length ?? 0))).fill(0);
      return context;
    }

    /* -------------------------------------------- */

    /**
     * Gemeinsame Kampfwerte für Übersicht und Kampf-Tab.
     * @protected
     */
    _ascCombatStats() {
      const { attributes } = this.actor.system;
      const speed = Object.entries(CONFIG.DND5E.movementTypes).reduce((obj, [k, { hidden, label }]) => {
        if ( hidden ) return obj;
        const value = attributes.movement.speeds?.[k] ?? attributes.movement[k] ?? 0;
        if ( value > obj.value ) Object.assign(obj, { label, value });
        return obj;
      }, { label: CONFIG.DND5E.movementTypes.walk?.label, value: 0 });
      const units = attributes.movement.units;
      return {
        ac: attributes.ac.value,
        init: attributes.init.total,
        speed: speed.value,
        speedUnit: CONFIG.DND5E.movementUnits[units]?.abbreviation ?? units ?? "",
        speedLabel: speed.label,
        prof: attributes.prof,
        concentration: attributes.concentration?.save
      };
    }

    /* -------------------------------------------- */

    /**
     * Alle nutzbaren Aktivitäten (ohne Zauber) für Angriffs- und Aktionslisten.
     * @param {object} context
     * @returns {object[]}
     * @protected
     */
    _ascCollectActions(context) {
      const rows = [];
      for ( const item of this.actor.items ) {
        if ( item.type === "spell" ) continue;
        if ( !this._isItemVisible(item) ) continue;
        if ( this.actor.items.has(item.system.container) ) continue;
        const activities = item.system.activities?.filter(a => !a.isHidden && a.activation?.type) ?? [];
        if ( !activities.length ) continue;
        const equipped = ("equipped" in item.system) ? !!item.system.equipped : true;
        for ( const activity of activities ) {
          const type = activity.activation.type;
          const group = ACTION_GROUPS.includes(type) ? type : "other";
          const damage = (activity.labels?.damage ?? []).map(d => d.formula).filter(_ => _).join(" + ");
          const uses = item.system.uses?.max ? { value: item.system.uses.value, max: item.system.uses.max } : null;
          rows.push({
            item,
            itemId: item.id,
            activityId: activity.id,
            img: item.img,
            name: activities.length > 1 ? `${item.name}: ${activity.name}` : item.name,
            subtitle: [
              game.i18n.localize(CONFIG.Item.typeLabels[item.type] ?? ""),
              activity.activationLabels?.activation ?? item.labels.activation
            ].filter(_ => _).join(" · "),
            group,
            isAttack: activity.type === "attack",
            toHit: activity.labels?.toHit ?? "",
            damage,
            save: activity.labels?.save ?? "",
            uses,
            equipped,
            equippable: "equipped" in item.system,
            isWeapon: item.type === "weapon",
            sort: item.sort
          });
        }
      }
      return rows.sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name, game.i18n.lang));
    }

    /* -------------------------------------------- */

    /**
     * Übersichtsseite nach dem Design-Entwurf.
     * @protected
     */
    async _ascPrepareOverview(context, options) {
      // Fertigkeiten & Rettungswürfe vom System vorbereiten lassen.
      context = await this._prepareDetailsContext(context, options);
      const { system } = this.actor;

      // Attribute
      context.ascAbilities = this._prepareAbilities(context).map(a => ({
        ...a,
        icon: ABILITY_ICONS[a.key] ?? "fa-solid fa-circle"
      }));

      // Passive Werte
      context.ascPassives = ["prc", "inv", "ins"].filter(k => system.skills?.[k]).map(k => ({
        key: k,
        label: CONFIG.DND5E.skills[k]?.label,
        value: system.skills[k].passive
      }));

      // Fertigkeiten mit Übungsstatus
      context.ascSkills = context.skills.map(s => {
        const multiplier = system.skills[s.key]?.prof?.multiplier ?? 0;
        return {
          ...s,
          profClass: Base.PROFICIENCY_CLASSES[multiplier] ?? "none",
          icon: SKILL_ICONS[s.key] ?? "fa-solid fa-circle-dot",
          abilityMod: system.abilities[s.ability]?.mod ?? 0,
          favorite: !!system.hasFavorite?.(s.key),
          total: s.total
        };
      });
      context.ascSaves = Object.values(context.saves).filter(s => !s.isConcentration).map(s => ({
        ...s, icon: ABILITY_ICONS[s.key] ?? "fa-solid fa-circle"
      }));

      // Kampf
      context.ascCombat = this._ascCombatStats();
      // Angriffe zuerst (ausgerüstet), danach weitere Aktionen/Bonusaktionen, bis die Liste voll ist.
      const actions = this._ascCollectActions(context).filter(r => r.equipped);
      const attacks = actions.filter(r => r.isAttack || (r.isWeapon && r.damage));
      const others = actions.filter(r => !attacks.includes(r) && ["action", "bonus", "reaction"].includes(r.group)
        && (r.item.type === "feat"));
      context.ascAttacks = [...attacks, ...others].slice(0, 6);
      context.ascAbilityIcons = ABILITY_ICONS;

      // Zauber
      context.ascSpellcasting = this._ascSpellcasting();
      context.ascSpellSections = Object.values(context.spellbook ?? {})
        .filter(s => s.items.length || s.usesSlots)
        .sort((a, b) => (a.order - b.order) || ((a.dataset.level ?? 0) - (b.dataset.level ?? 0)))
        .map(section => ({
          label: section.label,
          prop: section.usesSlots ? `system.spells.${section.slot}.value` : null,
          pips: section.pips ?? [],
          spells: section.items.map(spell => {
            const ctx = context.itemContext[spell.id] ?? {};
            const saveAbility = spell.system.activities?.getByType?.("save")?.[0]?.save?.ability;
            const attack = spell.system.activities?.getByType?.("attack")?.[0];
            let roll = "–";
            if ( saveAbility?.size ) roll = Array.from(saveAbility).map(a => CONFIG.DND5E.abilities[a]?.abbreviation)
              .map(a => game.i18n.localize(a ?? "")).join("/").toUpperCase();
            else if ( attack ) roll = attack.labels?.toHit ?? "–";
            const uses = spell.system.uses?.max ? `${spell.system.uses.value}/${spell.system.uses.max}` : "–";
            return {
              id: spell.id,
              uuid: spell.uuid,
              name: spell.name,
              img: spell.img,
              roll, uses,
              subtitle: [ctx.activation, ctx.range?.distance ? `${ctx.range.value} ${ctx.range.unit}` : null]
                .filter(_ => _).join(" · "),
              prepared: ctx.preparation?.applicable ? !!spell.system.prepared : null,
              concentration: spell.system.properties?.has("concentration")
            };
          })
        }));
      context.ascSlots = Object.values(context.spellbook ?? {})
        .filter(s => s.usesSlots && s.pips?.length)
        .map(s => {
          const value = s.pips.filter(p => p.filled).length;
          return { slot: s.slot, level: s.dataset.level, label: s.label, value, max: s.pips.length, empty: !value };
        });
      const slotTotals = context.ascSlots.reduce((t, s) => ({ value: t.value + s.value, max: t.max + s.max }),
        { value: 0, max: 0 });
      context.ascSlotTotal = { ...slotTotals, pct: slotTotals.max ? Math.round(slotTotals.value / slotTotals.max * 100) : 0 };

      // Inventar
      const currencies = CONFIG.DND5E.currencies;
      context.ascInventory = this.actor.items
        .filter(i => ("quantity" in i.system) && !this.actor.items.has(i.system.container) && this._isItemVisible(i))
        .sort((a, b) => a.sort - b.sort)
        .map(item => {
          const price = item.system.price;
          return {
            id: item.id,
            uuid: item.uuid,
            name: item.name,
            img: item.img,
            subtitle: game.i18n.localize(CONFIG.Item.typeLabels[item.type] ?? ""),
            price: price?.value ? price.value : "–",
            priceIcon: price?.value ? currencies[price.denomination]?.icon : null,
            priceLabel: price?.value ? game.i18n.localize(currencies[price.denomination]?.label ?? "") : "",
            weight: item.system.weight?.value ? item.system.weight.value : "–",
            quantity: item.system.quantity,
            equipped: item.system.equipped
          };
        });
      const enc = system.attributes.encumbrance ?? {};
      context.ascEncumbrance = {
        value: Math.round((enc.value ?? 0) * 10) / 10,
        max: enc.max ?? 0,
        pct: Math.clamp(enc.pct ?? 0, 0, 100),
        encumbered: (enc.pct ?? 0) >= 100
      };
      context.ascCurrency = Object.entries(currencies).map(([key, c]) => ({
        key,
        name: `system.currency.${key}`,
        label: game.i18n.localize(c.label),
        abbr: game.i18n.localize(c.abbreviation),
        icon: c.icon,
        value: system.currency?.[key] ?? 0
      }));

      // Merkmale nach Herkunft
      const groups = new Map();
      const classes = this.actor.classes ?? {};
      for ( const item of this.actor.itemTypes.feat ) {
        if ( !this._isItemVisible(item) ) continue;
        const origin = context.itemContext[item.id]?.groups?.origin ?? "other";
        let label;
        if ( origin === "species" ) label = game.i18n.localize("ASCSHEET.Features.species");
        else if ( origin === "background" ) label = game.i18n.localize("ASCSHEET.Features.background");
        else if ( classes[origin] ) label = game.i18n.format("ASCSHEET.Features.class", { class: classes[origin].name });
        else label = game.i18n.localize("ASCSHEET.Features.other");
        if ( !groups.has(origin) ) groups.set(origin, { id: origin, label, items: [] });
        const uses = item.system.uses?.max ? `${item.system.uses.value}/${item.system.uses.max}` : "";
        groups.get(origin).items.push({ id: item.id, uuid: item.uuid, name: item.name, img: item.img, uses });
      }
      const order = id => (classes[id] ? 0 : id === "species" ? 1 : id === "background" ? 2 : 3);
      context.ascFeatureGroups = Array.from(groups.values()).sort((a, b) => order(a.id) - order(b.id));

      // Zustände
      context.ascConditions = this._ascConditions();

      // Hintergrund
      const bgIcons = { trait: "fa-solid fa-masks-theater", ideal: "fa-solid fa-sun", bond: "fa-solid fa-link",
        flaw: "fa-solid fa-mask" };
      context.ascBackground = ["trait", "ideal", "bond", "flaw"].map(key => ({
        key,
        icon: bgIcons[key],
        label: game.i18n.localize(`ASCSHEET.Background.${key}`),
        text: plainText(system.details[key], 70)
      }));
      context.ascBiography = plainText(system.details.biography?.value, 160);

      return context;
    }

    /* -------------------------------------------- */

    /**
     * Zauberwerte der Hauptklasse.
     * @returns {object|null}
     * @protected
     */
    _ascSpellcasting() {
      const classes = Object.values(this.actor.spellcastingClasses ?? {})
        .sort((a, b) => b.system.levels - a.system.levels);
      if ( !classes.length ) return null;
      return classes.map(item => {
        const sc = item.spellcasting;
        return {
          label: item.name,
          ability: CONFIG.DND5E.abilities[sc.ability]?.abbreviation ?? sc.ability,
          attack: sc.attack,
          save: sc.save
        };
      });
    }

    /* -------------------------------------------- */

    /**
     * Zustände zum Umschalten.
     * @returns {object[]}
     * @protected
     */
    _ascConditions() {
      return Object.entries(CONFIG.DND5E.conditionTypes).reduce((arr, [id, c]) => {
        if ( c.pseudo ) return arr;
        const level = id === "exhaustion" ? (this.actor.system.attributes.exhaustion ?? 0) : null;
        arr.push({
          id,
          name: game.i18n.localize(c.name ?? c.label ?? id),
          img: c.img ?? c.icon,
          active: (level ?? 0) > 0 || this.actor.statuses.has(id),
          level,
          isExhaustion: id === "exhaustion",
          reference: c.reference
        });
        return arr;
      }, []);
    }

    /* -------------------------------------------- */

    /**
     * Kampf-Tab: Kampfwerte und alle Aktionen nach Aktionstyp.
     * @protected
     */
    async _ascPrepareCombat(context, options) {
      context.ascCombat = this._ascCombatStats();
      const rows = this._ascCollectActions(context);
      context.ascActionGroups = ACTION_GROUPS.map(id => ({
        id,
        label: game.i18n.localize(`ASCSHEET.Combat.group.${id}`),
        rows: rows.filter(r => r.group === id)
      })).filter(g => g.rows.length);
      context.ascConditions = this._ascConditions();
      const { hp, death } = this.actor.system.attributes;
      context.ascHp = hp;
      context.ascDeath = ["success", "failure"].map(type => ({
        type,
        label: game.i18n.localize(`ASCSHEET.Death.${type}`),
        prop: `system.attributes.death.${type}`,
        pips: [1, 2, 3].map(n => ({ n, filled: (death[type] ?? 0) >= n }))
      }));
      return context;
    }

    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onRender(context, options) {
      await super._onRender(context, options);
      applyTheme(this.element, getActiveTheme(this.document));
      this._ascMoveWindowButtons();
      this._ascUpdateZoom();
      this._ascBindSearch();
      this.element.classList.toggle("asc-can-edit", this.canEditSheet);
      this.element.classList.toggle("asc-no-edit", !this.canEditSheet);
      // Erstellen-Button nur anzeigen, wenn es für den aktuellen Tab etwas zu erstellen gibt.
      this.element.querySelector(".create-child")?.toggleAttribute("hidden",
        ["overview", "combat", "details", "biography"].includes(this.tabGroups.primary));
    }

    /**
     * Rasten-, Bearbeiten- und SL-Knöpfe sitzen wie im Entwurf als kleine Quadrate oben rechts in der Fensterleiste.
     * @protected
     */
    _ascMoveWindowButtons() {
      const header = this.element.querySelector(".window-header");
      const buttons = this.element.querySelector(".asc-header .asc-window-buttons");
      if ( !header || !buttons ) return;
      header.querySelector(":scope > .asc-window-buttons")?.remove();
      const firstControl = header.querySelector(":scope > .header-control, :scope > button");
      if ( firstControl ) firstControl.before(buttons);
      else header.append(buttons);
    }

    /* -------------------------------------------- */

    /**
     * Den Inhalt proportional zur Fenstergröße skalieren, damit der Bogen immer wie der Entwurf aussieht.
     * @protected
     */
    _ascUpdateZoom() {
      const content = this.element?.querySelector(".window-content");
      if ( !content || this.minimized ) return;
      const width = content.clientWidth;
      const height = content.clientHeight;
      if ( !width || !height ) return;
      const zoom = Math.clamp(Math.min(width / DESIGN.width, height / DESIGN.height), DESIGN.minZoom, DESIGN.maxZoom);
      this.element.style.setProperty("--asc-zoom", zoom.toFixed(4));
    }

    /** @inheritDoc */
    _onPosition(position) {
      super._onPosition(position);
      this._ascUpdateZoom();
      this._ascSaveSize ??= foundry.utils.debounce(({ width, height }) => {
        if ( !Number.isFinite(width) || !Number.isFinite(height) ) return;
        game.user.setFlag(MODULE_ID, "sheetSize", { width, height });
      }, 500);
      this._ascSaveSize(position);
    }

    /* -------------------------------------------- */

    /**
     * Einfache Suchfelder der Übersicht (Zauber, Inventar, Effekte). Filtert sofort beim Tippen.
     * @protected
     */
    _ascBindSearch() {
      for ( const input of this.element.querySelectorAll("input.asc-search-input") ) {
        const key = input.dataset.search;
        input.value = this._ascSearch[key] ?? "";
        const apply = () => {
          this._ascSearch[key] = input.value;
          const term = input.value.trim().toLocaleLowerCase(game.i18n.lang);
          const scope = this.element.querySelector(`[data-search-scope="${key}"]`);
          for ( const row of scope?.querySelectorAll("[data-search-text]") ?? [] ) {
            row.hidden = !!term && !row.dataset.searchText.toLocaleLowerCase(game.i18n.lang).includes(term);
          }
          for ( const group of scope?.querySelectorAll("[data-search-group]") ?? [] ) {
            group.hidden = !!term && !group.querySelector("[data-search-text]:not([hidden])");
          }
        };
        input.addEventListener("input", apply);
        input.addEventListener("change", event => event.stopPropagation());
        input.addEventListener("keydown", event => { if ( event.key === "Enter" ) event.preventDefault(); });
        apply();
      }
    }

    /** @inheritDoc */
    changeTab(tab, group, options) {
      super.changeTab(tab, group, options);
      if ( group !== "primary" ) return;
      this.element?.querySelector(".create-child")?.toggleAttribute("hidden",
        ["overview", "combat", "details", "biography"].includes(tab));
    }

    /* -------------------------------------------- */
    /*  Drag & Drop / Erstellen                     */
    /* -------------------------------------------- */

    /** @inheritDoc */
    async _onDropSingleItem(event, itemData, options={}) {
      if ( ORIGIN_TYPES.has(itemData.type) && !this.canSetupOrigin(itemData.type) ) {
        this.#warnNoRights();
        return null;
      }
      return super._onDropSingleItem(event, itemData, options);
    }

    /** @inheritDoc */
    _addDocumentItemTypes(tab) {
      const types = super._addDocumentItemTypes(tab);
      if ( this.canEditSheet ) return types;
      return types.filter(t => !ORIGIN_TYPES.has(t));
    }

    /* -------------------------------------------- */
    /*  Aktionen                                    */
    /* -------------------------------------------- */

    /**
     * Kompendium-Browser öffnen, um Klasse/Spezies/Hintergrund/Unterklasse usw. zu wählen.
     * Entspricht dem Original, prüft aber die Bearbeitungsrechte.
     * @this {AscandirCharacterSheet}
     */
    static async #findItem(event, target) {
      if ( !this.isEditable ) return;
      const { classIdentifier, facilityType, itemType: type } = target.dataset;
      if ( ORIGIN_TYPES.has(type) && !this.canSetupOrigin(type) ) return this.#warnNoRights();
      const filters = { locked: { types: new Set([type]) } };

      if ( classIdentifier ) filters.locked.additional = { class: { [classIdentifier]: 1 } };
      if ( type === "class" ) {
        const existingIdentifiers = new Set(Object.keys(this.actor.classes));
        filters.initial = { additional: { properties: { sidekick: -1 } } };
        filters.locked.arbitrary = [{ o: "NOT", v: { k: "system.identifier", o: "in", v: existingIdentifiers } }];
      }
      if ( type === "facility" ) {
        const otherType = facilityType === "basic" ? "special" : "basic";
        filters.locked.additional = {
          type: { [facilityType]: 1, [otherType]: -1 },
          level: { max: this.actor.system.details.level }
        };
      }

      const result = await CompendiumBrowser.selectOne({ filters }, this._detachOptions());
      if ( result ) {
        this._onDropCreateItems(event, [game.items.fromCompendium(await fromUuid(result), { keepId: true })]);
      }
    }

    /**
     * Bearbeitungsmodus umschalten (nur mit Rechten).
     * @this {AscandirCharacterSheet}
     */
    static #toggleEdit(event, target) {
      this.changeMode();
    }

    /**
     * SL: Bearbeitung für Spieler dieses Charakters freigeben oder sperren.
     * @this {AscandirCharacterSheet}
     */
    static async #togglePlayerEdit(event, target) {
      if ( !game.user.isGM ) return;
      const unlocked = !!this.actor.getFlag(MODULE_ID, FLAG_PLAYER_EDIT);
      if ( unlocked ) await this.actor.unsetFlag(MODULE_ID, FLAG_PLAYER_EDIT);
      else await this.actor.setFlag(MODULE_ID, FLAG_PLAYER_EDIT, true);
      ui.notifications.info(game.i18n.format(
        unlocked ? "ASCSHEET.Notify.Locked" : "ASCSHEET.Notify.Unlocked", { name: this.actor.name }
      ));
    }

    /**
     * Gegenstand/Merkmal/Zauber benutzen.
     * @this {AscandirCharacterSheet}
     */
    static async #useItem(event, target) {
      if ( event.target.closest("input, select") ) return;
      const itemId = target.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if ( !item ) return;
      if ( !this.isEditable || (item.type === "container") ) return item.sheet.render({ force: true });
      const activityId = target.closest("[data-activity-id]")?.dataset.activityId;
      if ( activityId ) {
        const activity = item.system.activities?.get(activityId);
        if ( activity?.canUse !== false ) return activity?.use({ event }, { options: { sheet: this } });
        return;
      }
      return item.use({ event }, { options: { sheet: this } });
    }

    /**
     * Blatt eines Gegenstands öffnen.
     * @this {AscandirCharacterSheet}
     */
    static #showItem(event, target) {
      const itemId = target.closest("[data-item-id]")?.dataset.itemId;
      this.actor.items.get(itemId)?.sheet.render({ force: true });
    }

    /**
     * Zu einem Tab springen.
     * @this {AscandirCharacterSheet}
     */
    static #goTab(event, target) {
      const tab = target.dataset.tab;
      if ( tab ) this.changeTab(tab, "primary");
    }

    /**
     * Zustand umschalten. Erschöpfung: Linksklick +1, Rechtsklick -1 (über contextmenu-Listener).
     * @this {AscandirCharacterSheet}
     */
    static async #toggleCondition(event, target) {
      if ( !this.isEditable ) return;
      const id = target.closest("[data-condition]")?.dataset.condition;
      if ( !id ) return;
      if ( id === "exhaustion" ) {
        const level = this.actor.system.attributes.exhaustion ?? 0;
        const max = CONFIG.DND5E.conditionTypes.exhaustion?.levels ?? 6;
        return this.actor.update({ "system.attributes.exhaustion": event.shiftKey ? Math.max(level - 1, 0) : Math.min(level + 1, max) });
      }
      return this.actor.toggleStatusEffect(id);
    }

    /**
     * Fertigkeit als Favorit markieren/entfernen (linker Kreis in der Fertigkeitenliste).
     * @this {AscandirCharacterSheet}
     */
    static async #toggleSkillFavorite(event, target) {
      if ( !this.isEditable ) return;
      const key = target.closest("[data-key]")?.dataset.key;
      if ( !key ) return;
      const system = this.actor.system;
      if ( system.hasFavorite(key) ) return system.removeFavorite(key);
      return system.addFavorite({ type: "skill", id: key });
    }

    /**
     * Zauberplatz-Kachel: Klick verbraucht einen Platz, Umschalt+Klick stellt einen wieder her.
     * @this {AscandirCharacterSheet}
     */
    static async #spendSlot(event, target) {
      if ( !this.isEditable ) return;
      const slot = target.closest("[data-slot]")?.dataset.slot;
      const data = this.actor.system.spells?.[slot];
      if ( !data ) return;
      const max = data.override ?? data.max ?? 0;
      const value = event.shiftKey ? Math.min((data.value ?? 0) + 1, max) : Math.max((data.value ?? 0) - 1, 0);
      if ( value !== data.value ) return this.actor.update({ [`system.spells.${slot}.value`]: value });
    }

    /**
     * Suchfeld leeren.
     * @this {AscandirCharacterSheet}
     */
    static #clearSearch(event, target) {
      const input = target.closest(".asc-search")?.querySelector("input");
      if ( !input ) return;
      input.value = "";
      input.dispatchEvent(new Event("input"));
    }

    /**
     * Ausrüsten/Ablegen.
     * @this {AscandirCharacterSheet}
     */
    static async #toggleEquipped(event, target) {
      if ( !this.isEditable ) return;
      const itemId = target.closest("[data-item-id]")?.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if ( item && ("equipped" in item.system) ) return item.update({ "system.equipped": !item.system.equipped });
    }
  }

  return AscandirCharacterSheet;
}
