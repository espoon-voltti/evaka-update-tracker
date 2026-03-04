import { parseTypeScriptFeatureFlags } from '../../src/services/parsers/typescript-flags';

describe('parseTypeScriptFeatureFlags', () => {
  describe('Pattern A (Espoo-style inline prod)', () => {
    const patternA = `
import type { FeatureFlags } from 'lib-customizations/types'

const features: Features = {
  default: {
    environmentLabel: 'Lokaali',
    citizenShiftCareAbsence: true,
  },
  staging: {
    environmentLabel: 'Staging',
    citizenShiftCareAbsence: true,
  },
  prod: {
    environmentLabel: null,
    citizenShiftCareAbsence: true,
    assistanceActionOther: true,
    daycareApplication: {
      dailyTimes: true,
      serviceNeedOption: false
    },
    preschoolApplication: {
      connectedDaycarePreferredStartDate: true,
      serviceNeedOption: false
    },
    decisionDraftMultipleUnits: false,
    preschool: true,
    preparatory: true,
    voucherUnitPayments: false,
    archiveIntegration: {
      childDocuments: true
    },
    placementDesktop: true
  }
}

const featureFlags = features[env()]
export default featureFlags
`;

    it('parses simple boolean values', () => {
      const result = parseTypeScriptFeatureFlags(patternA);
      expect(result.citizenShiftCareAbsence).toBe(true);
      expect(result.assistanceActionOther).toBe(true);
      expect(result.decisionDraftMultipleUnits).toBe(false);
      expect(result.preschool).toBe(true);
      expect(result.preparatory).toBe(true);
      expect(result.voucherUnitPayments).toBe(false);
      expect(result.placementDesktop).toBe(true);
    });

    it('flattens nested objects to dot notation', () => {
      const result = parseTypeScriptFeatureFlags(patternA);
      expect(result['daycareApplication.dailyTimes']).toBe(true);
      expect(result['daycareApplication.serviceNeedOption']).toBe(false);
      expect(result['preschoolApplication.connectedDaycarePreferredStartDate']).toBe(true);
      expect(result['preschoolApplication.serviceNeedOption']).toBe(false);
      expect(result['archiveIntegration.childDocuments']).toBe(true);
    });

    it('skips environmentLabel', () => {
      const result = parseTypeScriptFeatureFlags(patternA);
      expect(result).not.toHaveProperty('environmentLabel');
    });
  });

  describe('Pattern B (trevaka-style standalone const prod)', () => {
    const patternB = `
import type { FeatureFlags } from 'lib-customizations/types'

const prod: FeatureFlags = {
  environmentLabel: null,
  citizenShiftCareAbsence: false,
  daycareApplication: {
    dailyTimes: false,
    serviceNeedOption: true
  },
  preschoolApplication: {
    connectedDaycarePreferredStartDate: true,
    serviceNeedOption: true
  },
  decisionDraftMultipleUnits: true,
  urgencyAttachments: true,
  preschool: true,
  preparatory: false,
  assistanceActionOther: false,
  placementGuarantee: true,
  intermittentShiftCare: true,
  citizenAttendanceSummary: true,
  noAbsenceType: true,
  voucherUnitPayments: true,
  archiveIntegration: {
    decisions: true,
    feeDecisions: true,
    voucherValueDecisions: true,
    childDocuments: true
  },
  decisionChildDocumentTypes: true
}

const features: Features = {
  default: { ...prod, environmentLabel: 'Test' },
  staging: { ...prod, environmentLabel: 'Staging' },
  prod
}

const featureFlags = features[env()]
export default featureFlags
`;

    it('parses simple boolean values', () => {
      const result = parseTypeScriptFeatureFlags(patternB);
      expect(result.citizenShiftCareAbsence).toBe(false);
      expect(result.decisionDraftMultipleUnits).toBe(true);
      expect(result.urgencyAttachments).toBe(true);
      expect(result.preparatory).toBe(false);
      expect(result.assistanceActionOther).toBe(false);
      expect(result.intermittentShiftCare).toBe(true);
    });

    it('flattens nested objects to dot notation', () => {
      const result = parseTypeScriptFeatureFlags(patternB);
      expect(result['daycareApplication.dailyTimes']).toBe(false);
      expect(result['daycareApplication.serviceNeedOption']).toBe(true);
      expect(result['archiveIntegration.decisions']).toBe(true);
      expect(result['archiveIntegration.feeDecisions']).toBe(true);
      expect(result['archiveIntegration.voucherValueDecisions']).toBe(true);
      expect(result['archiveIntegration.childDocuments']).toBe(true);
    });

    it('skips environmentLabel', () => {
      const result = parseTypeScriptFeatureFlags(patternB);
      expect(result).not.toHaveProperty('environmentLabel');
    });

    it('parses all flags correctly', () => {
      const result = parseTypeScriptFeatureFlags(patternB);
      // Should have all the top-level + nested flags
      const keys = Object.keys(result);
      expect(keys.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('optional flags', () => {
    it('includes optional flags when present', () => {
      const source = `
const prod: FeatureFlags = {
  environmentLabel: null,
  citizenShiftCareAbsence: true,
  assistanceActionOther: true,
  daycareApplication: { dailyTimes: true, serviceNeedOption: false },
  preschoolApplication: { connectedDaycarePreferredStartDate: true, serviceNeedOption: false },
  decisionDraftMultipleUnits: false,
  preschool: true,
  preparatory: true,
  urgencyAttachments: true,
  financeDecisionHandlerSelect: false,
  feeDecisionPreschoolClubFilter: false,
  placementGuarantee: true,
  intermittentShiftCare: false,
  citizenAttendanceSummary: false,
  noAbsenceType: false,
  voucherUnitPayments: true,
  voucherValueSeparation: true,
  extendedPreschoolTerm: true,
  jamixIntegration: true,
  titaniaErrorsReport: false,
  serviceApplications: true
}

const features: Features = { default: prod, staging: prod, prod }
`;
      const result = parseTypeScriptFeatureFlags(source);
      expect(result.jamixIntegration).toBe(true);
      expect(result.titaniaErrorsReport).toBe(false);
      expect(result.serviceApplications).toBe(true);
    });
  });

  it('throws when prod block is not found', () => {
    const source = `const features = { default: {}, staging: {} }`;
    expect(() => parseTypeScriptFeatureFlags(source)).toThrow(
      'Could not find prod feature flags block'
    );
  });
});
