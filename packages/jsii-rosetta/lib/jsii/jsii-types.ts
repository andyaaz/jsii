import * as ts from 'typescript';

import { BuiltInType, builtInTypeName, mapElementType } from '../typescript/types';

// eslint-disable-next-line prettier/prettier
export type JsiiType =
  | { kind: 'unknown' }
  | { kind: 'error'; message: string }
  | { kind: 'map'; elementType: JsiiType }
  | { kind: 'list'; elementType: JsiiType }
  | { kind: 'namedType'; name: string }
  | { kind: 'builtIn'; builtIn: BuiltInType };

export function determineJsiiType(typeChecker: ts.TypeChecker, type: ts.Type): JsiiType {
  // this means the snippet didn't have enough info for the TypeScript compiler to figure out the type -
  // so, just render the fallback
  if ((type as any).intrinsicName === 'error') {
    return { kind: 'unknown' };
  }

  type = type.getNonNullableType();

  const mapValuesType = mapElementType(type, typeChecker);
  if (mapValuesType.result === 'map') {
    return {
      kind: 'map',
      elementType: mapValuesType.elementType
        ? determineJsiiType(typeChecker, mapValuesType.elementType)
        : { kind: 'builtIn', builtIn: 'any' },
    };
  }

  // User-defined or aliased type
  if (type.aliasSymbol) {
    return { kind: 'namedType', name: type.aliasSymbol.name };
  }
  if (type.symbol) {
    return { kind: 'namedType', name: type.symbol.name };
  }

  const typeScriptBuiltInType = builtInTypeName(type);
  if (typeScriptBuiltInType) {
    return { kind: 'builtIn', builtIn: typeScriptBuiltInType };
  }

  if (type.isUnion() || type.isIntersection()) {
    return { kind: 'error', message: 'Type unions or intersections are not supported in examples' };
  }
  return { kind: 'unknown' };
}
