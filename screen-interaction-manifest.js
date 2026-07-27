(() => {
  "use strict";

  const screens = Object.freeze({
    game_configuration: Object.freeze({
      title: "Gamesessie configureren",
      interactions: Object.freeze([
        { id: "select_variant", selector: "[data-session-game-type]", action: "change", description: "Laadt alle presetwaarden voor de gekozen LO-Game." },
        { id: "toggle_supplier", selector: "[name='has_supplier']", action: "change", description: "Schakelt de leverancier en de bijbehorende actieve rol gezamenlijk." },
        { id: "set_tower_types", selector: "[name='product_type_count']", action: "input", description: "Vast voor LO 1-5; vrij van 1 tot 9 vanaf LO 6." },
        { id: "set_color_mode", selector: "[name='multiple_colors']", action: "change", description: "Enkelkleurig voor LO 1-5; enkel- of meerkleurig vanaf LO 6." },
        { id: "set_currency_mode", selector: "[name='multiple_currencies']", action: "change", description: "Schakelt tussen één valuta en meerdere valuta met wisselkoersen." },
        { id: "create_session", selector: "[data-create-game-session]", action: "click", description: "Valideert de configuratie en maakt de lobby aan." }
      ])
    }),
    lego_tutorial: Object.freeze({
      title: "Toren A leren bouwen",
      interactions: Object.freeze([
        { id: "read_order", selector: ".builder-order-card", action: "inspect", description: "Bekijk de klantbestelling en het volledige bouwvoorbeeld." },
        { id: "select_brick", selector: "[data-piece-type='yellow_8']", action: "click", description: "Kies het juiste blok op kleur en maat." },
        { id: "rotate_brick", selector: ".builder-rotate", action: "click", description: "Draai een lang blok 90 graden; middelste muisknop, wiel en R werken ook." },
        { id: "place_brick", selector: ".builder-board", action: "drop", description: "Plaats op het noppenraster; de tutorial controleert positie en oriëntatie direct." }
      ])
    }),
    customer_quality_control: Object.freeze({
      title: "Klantacceptatie",
      interactions: Object.freeze([
        { id: "deliver", selector: ".builder-deliver", action: "click", description: "Vergelijkt de complete levering met de klantbestelling." },
        { id: "human_accept", selector: "[data-customer-accept]", action: "click", optional: true, description: "Een menselijke klant kan een afwijking toch accepteren." },
        { id: "human_reject", selector: "[data-customer-reject]", action: "click", optional: true, description: "Een menselijke klant kan een afwijking weigeren." }
      ])
    })
  });

  function createWalkthrough(screenId) {
    const screen = screens[screenId];
    if (!screen) return [];
    return screen.interactions.map((interaction, index) => ({
      ...interaction,
      step: index + 1,
      total: screen.interactions.length,
      screenTitle: screen.title
    }));
  }

  function validate(screenId, root = document) {
    return createWalkthrough(screenId)
      .filter(step => !step.optional && !root.querySelector(step.selector))
      .map(step => step.id);
  }

  window.LEARNGameInteractionManifest = Object.freeze({
    screens,
    createWalkthrough,
    validate
  });
})();
