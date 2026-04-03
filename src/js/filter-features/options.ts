import { capitalize } from "lodash-es";

import {
  FilterState,
  PlaceFilterManager,
  NudgeTypeFilter,
} from "../state/FilterState";
import Observable from "../state/Observable";
import {
  BaseAccordionElements,
  AccordionState,
  generateAccordion,
  generateCheckbox,
  updateAccordionUI,
} from "../layout/accordion";

import optionValuesData from "../../../data/option-values.json" with { type: "json" };

import { ALL_NUDGE_TYPE, NudgeStatus } from "../model/types";

/** These option values change depending on which dataset is loaded.
 *
 * Note that some datasets may not actually use a particular option group, but
 * we still include it to make the modeling simpler.
 *
 * Keep in alignment with FilterState.
 */
type DataSetSpecificOptions = {
  includedNudges: readonly string[];
  country: string[];
  year: string[];
  placeType: string[];
  orgCredit: string[];
};

export interface FilterOptions {
  readonly merged: DataSetSpecificOptions;
  readonly datasets: Record<
    NudgeTypeFilter,
    Record<NudgeStatus, DataSetSpecificOptions>
  >;
  getOptions(
    nudgeType: NudgeTypeFilter,
    status: NudgeStatus,
  ): DataSetSpecificOptions;
  enabled(nudgeType: NudgeTypeFilter, status: NudgeStatus): boolean;
}

export const FILTER_OPTIONS: FilterOptions = {
  merged: {
    includedNudges: ALL_NUDGE_TYPE,
    ...optionValuesData.merged,
  },
  // TODO: need to update optionValues script to replace empty arrays in option-values.json
  datasets: {
    "any nudge": {
      adopted: {
        includedNudges: ALL_NUDGE_TYPE,
        ...optionValuesData.anyAdopted,
      },
      pledged: {
        includedNudges: ALL_NUDGE_TYPE,
        ...optionValuesData.anyPledged,
      },
    },
    "plant-based default": {
      adopted: {
        includedNudges: [],
        ...optionValuesData.defaultAdopted,
      },
      pledged: {
        includedNudges: [],
        ...optionValuesData.defaultPledged,
      },
    },
    "climate-positive ratio": {
      adopted: {
        includedNudges: [],
        ...optionValuesData.ratioAdopted,
      },
      pledged: {
        includedNudges: [],
        ...optionValuesData.ratioPledged,
      },
    },
    "subtle substitution": {
      adopted: {
        includedNudges: [],
        ...optionValuesData.subAdopted,
      },
      pledged: {
        includedNudges: [],
        ...optionValuesData.subPledged,
      },
    },
    "tasty titles": {
      adopted: {
        includedNudges: [],
        ...optionValuesData.titlesAdopted,
      },
      pledged: {
        includedNudges: [],
        ...optionValuesData.titlesPledged,
      },
    },
    "prime placement": {
      adopted: {
        includedNudges: [],
        ...optionValuesData.placementAdopted,
      },
      pledged: {
        includedNudges: [],
        ...optionValuesData.placementPledged,
      },
    },
    other: {
      adopted: {
        includedNudges: [],
        ...optionValuesData.otherAdopted,
      },
      pledged: {
        includedNudges: [],
        ...optionValuesData.otherPledged,
      },
    },
  },

  getOptions(
    nudgeType: NudgeTypeFilter,
    status: NudgeStatus,
  ): DataSetSpecificOptions {
    return this.datasets[nudgeType][status];
  },

  // TODO: check if i need this
  enabled(nudgeType: NudgeTypeFilter, status: NudgeStatus): boolean {
    return this.datasets[nudgeType][status].placeType.length > 0;
  },
} as const;

function getVisibleCheckboxes(
  fieldset: HTMLFieldSetElement,
): Array<HTMLInputElement> {
  const allCheckboxes = fieldset.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"]',
  );
  return Array.from(allCheckboxes).filter(
    (checkbox) => !checkbox.parentElement?.hidden,
  );
}

function extractLabel(
  input: HTMLInputElement,
  preserveCapitalization?: boolean,
): string | undefined {
  const text = input.parentElement?.textContent?.trim();
  return preserveCapitalization ? text : text?.toLowerCase();
}

/**
 * Get all options that are checked, regardless of if they are hidden.
 */
export function determineCheckedLabels(
  fieldset: HTMLFieldSetElement,
  preserveCapitalization?: boolean,
): Set<string> {
  return new Set(
    Array.from(
      fieldset.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"]:checked',
      ),
    )
      .map((input) => extractLabel(input, preserveCapitalization))
      .filter((x) => x !== undefined),
  );
}

export function determineSupplementalTitle(
  fieldset: HTMLFieldSetElement,
): string {
  const visibleCheckboxes = getVisibleCheckboxes(fieldset);
  const total = visibleCheckboxes.length;
  const checked = visibleCheckboxes.filter(
    (checkbox) => checkbox.checked,
  ).length;
  return ` (${checked}/${total})`;
}

type FilterGroupAccordionElements = BaseAccordionElements & {
  fieldSet: HTMLFieldSetElement;
  checkAllButton: HTMLButtonElement;
  uncheckAllButton: HTMLButtonElement;
};

type FilterGroupParams = {
  htmlName: string;
  filterStateKey: keyof DataSetSpecificOptions;
  legend: string | ((state: FilterState) => string);
  /// If not set to true, the option will use Lodash's `capitalize()`. This
  /// only impacts the UI and not the underlying data.
  preserveCapitalization?: boolean;
  useTwoColumns?: boolean;
  hide?: (state: FilterState) => boolean;
};

function generateAccordionForFilterGroup(
  filterState: FilterState,
  params: FilterGroupParams,
): [FilterGroupAccordionElements, Observable<AccordionState>] {
  const baseElements = generateAccordion(params.htmlName);

  const fieldSet = document.createElement("fieldset");
  fieldSet.className = `filter-${params.htmlName}`;
  baseElements.contentContainer.appendChild(fieldSet);

  const groupSelectorButtons = document.createElement("div");
  groupSelectorButtons.className = "filter-group-selectors-container";
  fieldSet.appendChild(groupSelectorButtons);

  const checkAllButton = document.createElement("button");
  checkAllButton.type = "button";
  checkAllButton.textContent = "Check all";
  checkAllButton.id = `filter-${params.htmlName}-check-all`;
  groupSelectorButtons.appendChild(checkAllButton);

  const uncheckAllButton = document.createElement("button");
  uncheckAllButton.type = "button";
  uncheckAllButton.textContent = "Uncheck all";
  uncheckAllButton.id = `filter-${params.htmlName}-uncheck-all`;
  groupSelectorButtons.appendChild(uncheckAllButton);

  const filterOptionsContainer = document.createElement("div");
  filterOptionsContainer.className = "filter-checkbox-options-container";
  if (params.useTwoColumns) {
    filterOptionsContainer.className = "filter-checkbox-options-two-columns";
  }
  fieldSet.appendChild(filterOptionsContainer);

  // When setting up the filter group, we use `merged` to add every option in the universe.
  // However, we use the initial filterState to determine if it should be checked.
  FILTER_OPTIONS.merged[params.filterStateKey].forEach((val, i) => {
    const inputId = `filter-${params.htmlName}-option-${i}`;
    const checked = filterState[params.filterStateKey].has(val);
    const description = params.preserveCapitalization ? val : capitalize(val);
    const [label] = generateCheckbox(
      inputId,
      params.htmlName,
      checked,
      description,
    );
    filterOptionsContainer.appendChild(label);
  });

  const elements = {
    ...baseElements,
    fieldSet,
    checkAllButton,
    uncheckAllButton,
  };

  const accordionState = new Observable<AccordionState>(
    `filter accordion ${params.htmlName}`,
    {
      hidden: false,
      expanded: false,
      title:
        typeof params.legend === "string"
          ? params.legend
          : params.legend(filterState),
      supplementalTitle: determineSupplementalTitle(fieldSet),
    },
  );
  accordionState.subscribe((state) => updateAccordionUI(elements, state));
  baseElements.accordionButton.addEventListener("click", () => {
    const priorState = accordionState.getValue();
    accordionState.setValue({
      ...priorState,
      expanded: !priorState.expanded,
    });
  });
  accordionState.initialize();

  return [elements, accordionState];
}

function updateCheckboxStats(
  observable: Observable<AccordionState>,
  fieldSet: HTMLFieldSetElement,
): void {
  const accordionPriorState = observable.getValue();
  observable.setValue({
    ...accordionPriorState,
    supplementalTitle: determineSupplementalTitle(fieldSet),
  });
}

function initFilterGroup(
  filterManager: PlaceFilterManager,
  optionsContainer: HTMLDivElement,
  params: FilterGroupParams,
): void {
  const [accordionElements, accordionState] = generateAccordionForFilterGroup(
    filterManager.getState(),
    params,
  );
  optionsContainer.appendChild(accordionElements.outerContainer);

  accordionElements.fieldSet.addEventListener("change", () => {
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    const checkedLabels = determineCheckedLabels(
      accordionElements.fieldSet,
      params.preserveCapitalization,
    );
    filterManager.update({ [params.filterStateKey]: checkedLabels });
  });

  accordionElements.checkAllButton.addEventListener("click", () => {
    const visibleCheckboxes = getVisibleCheckboxes(accordionElements.fieldSet);
    visibleCheckboxes.forEach((input) => {
      // eslint-disable-next-line no-param-reassign
      input.checked = true;
    });
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    const checkedLabels = determineCheckedLabels(
      accordionElements.fieldSet,
      params.preserveCapitalization,
    );
    filterManager.update({
      [params.filterStateKey]: checkedLabels,
    });
  });

  accordionElements.uncheckAllButton.addEventListener("click", () => {
    const visibleCheckboxes = getVisibleCheckboxes(accordionElements.fieldSet);
    visibleCheckboxes.forEach((input) => {
      // eslint-disable-next-line no-param-reassign
      input.checked = false;
    });
    updateCheckboxStats(accordionState, accordionElements.fieldSet);
    const checkedLabels = determineCheckedLabels(
      accordionElements.fieldSet,
      params.preserveCapitalization,
    );
    filterManager.update({
      [params.filterStateKey]: checkedLabels,
    });
  });
}

export function initFilterOptions(filterManager: PlaceFilterManager): void {
  // Note that the order of this function determines the order of the filter.
  const filterPopup = document.querySelector<HTMLFormElement>("#filter-popup");
  if (!filterPopup) return;

  const optionsDiv = document.createElement("div");
  filterPopup.appendChild(optionsDiv);

  // Options about the Place
  initFilterGroup(filterManager, optionsDiv, {
    htmlName: "country",
    filterStateKey: "country",
    legend: "Countries",
    preserveCapitalization: true,
  });
}
