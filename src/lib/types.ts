import type {
  ConnectionRow,
  DataTypeRow,
  InterfaceRow,
  PortRow,
  ProjectRow,
  RunnableRow,
  SwcRow,
} from "@/db/schema";

export type SwcCategory =
  | "application"
  | "sensoractuator"
  | "composition"
  | "service"
  | "nvblock"
  | "parameter"
  | "ecu-abstraction"
  | "complex-device-driver";

export interface SrElement {
  name: string;
  typeRef: string; // dataType name
}

export interface CsArgument {
  name: string;
  direction: "IN" | "OUT" | "INOUT";
  typeRef: string;
}

export interface CsOperation {
  name: string;
  args: CsArgument[];
}

export interface FullProject {
  project: ProjectRow;
  components: (SwcRow & { ports: PortRow[]; runnables: RunnableRow[] })[];
  interfaces: InterfaceRow[];
  dataTypes: DataTypeRow[];
  connections: ConnectionRow[];
}

export const SWC_CATEGORIES: {
  value: SwcCategory;
  label: string;
  arxmlTag: string;
  dest: string;
}[] = [
  {
    value: "application",
    label: "Application SWC",
    arxmlTag: "APPLICATION-SOFTWARE-COMPONENT-TYPE",
    dest: "APPLICATION-SOFTWARE-COMPONENT-TYPE",
  },
  {
    value: "sensoractuator",
    label: "Sensor-Actuator SWC",
    arxmlTag: "SENSOR-ACTUATOR-SW-COMPONENT-TYPE",
    dest: "SENSOR-ACTUATOR-SW-COMPONENT-TYPE",
  },
  {
    value: "composition",
    label: "Composition SWC",
    arxmlTag: "COMPOSITION-SW-COMPONENT-TYPE",
    dest: "COMPOSITION-SW-COMPONENT-TYPE",
  },
  {
    value: "service",
    label: "Service SWC",
    arxmlTag: "SERVICE-SW-COMPONENT-TYPE",
    dest: "SERVICE-SW-COMPONENT-TYPE",
  },
  {
    value: "nvblock",
    label: "NV Block SWC",
    arxmlTag: "NV-BLOCK-SW-COMPONENT-TYPE",
    dest: "NV-BLOCK-SW-COMPONENT-TYPE",
  },
  {
    value: "parameter",
    label: "Parameter SWC",
    arxmlTag: "PARAMETER-SW-COMPONENT-TYPE",
    dest: "PARAMETER-SW-COMPONENT-TYPE",
  },
  {
    value: "ecu-abstraction",
    label: "ECU Abstraction SWC",
    arxmlTag: "ECU-ABSTRACTION-SW-COMPONENT-TYPE",
    dest: "ECU-ABSTRACTION-SW-COMPONENT-TYPE",
  },
  {
    value: "complex-device-driver",
    label: "Complex Device Driver",
    arxmlTag: "COMPLEX-DEVICE-DRIVER-SW-COMPONENT-TYPE",
    dest: "COMPLEX-DEVICE-DRIVER-SW-COMPONENT-TYPE",
  },
];

export const BASE_TYPES = [
  "boolean",
  "uint8",
  "uint16",
  "uint32",
  "uint64",
  "sint8",
  "sint16",
  "sint32",
  "sint64",
  "float32",
  "float64",
] as const;

export interface ProjectIssue {
  level: "error" | "warning";
  target: string;
  message: string;
}

export function isValidShortName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name);
}

export function srElements(iface: InterfaceRow): SrElement[] {
  return (iface.elements ?? []) as SrElement[];
}

export function csOperations(iface: InterfaceRow): CsOperation[] {
  return (iface.elements ?? []) as unknown as CsOperation[];
}
