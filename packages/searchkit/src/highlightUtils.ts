import { getSnippetFieldLength } from './transformRequest'
import type { ElasticsearchHit, SearchSettingsConfig } from './types'

export function highlightTerm(value: string, query: string): string {
  const regex = new RegExp(query, 'gi')
  return value.replace(regex, (match) => `<em>${match}</em>`)
}

export function shouldHighlightField(fieldKey: string, highlightFields: string[]) {
  return (
    highlightFields.findIndex((highlightField) => {
      if (highlightField.startsWith(fieldKey)) {
        return true;
      }

      if (highlightField.indexOf('*') < 0) {
        return highlightField === fieldKey
      }

      const safeHighlightField = highlightField.replace(/[.+?^$|\{\}\(\)\[\]\\]/g, '\\$&')
      const regex = new RegExp(`^${safeHighlightField.replace(/\*/g, '.*')}$`)
      return regex.test(fieldKey)
    }) >= 0
  )
}

function getHighlightedValue(value: any, field: string, hitHighlights?: Record<string, string[]>): string | null {
  const highlightedValues = hitHighlights?.[field] || hitHighlights?.[`${field}.keyword`];

  return highlightedValues
    ?.find((match: any) => match.replace(/\<em\>/g, '').replace(/\<\/em\>/g, '') === value) || null;
}

export function getHighlightFields(
  hit: ElasticsearchHit,
  preTag: string = '<ais-highlight-0000000000>',
  postTag: string = '<ais-highlight-0000000000/>',
  fields: SearchSettingsConfig['snippet_attributes'] = []
) {
  const highlightFields = fields.map((field) => getSnippetFieldLength(field).attribute)

  function mapValue(value: any, path: string): Record<string, any> | null {
    if (typeof value === "string") {
      const highlightedValue = getHighlightedValue(value, path, hit.highlight);

      if (!highlightedValue) {
        return {
          matchLevel: "none",
          matchedWords: [],
          value: value,
        };
      }

      return {
        fullyHighlighted: false,
        matchLevel: "full",
        matchedWords: Array.from(highlightedValue.matchAll(/\<em\>(.*?)\<\/em\>/g)).map((match: any) => match[1]),
        value: highlightedValue.replace(/\<em\>/g, preTag).replace(/\<\/em\>/g, postTag),
      };
    }

    if (Array.isArray(value)) {
      return value.map(item => mapValue(item, path));
    }

    if (typeof value === "object" && value !== null) {
      return mapObject(value, path);
    }

    return null;
  }

  function mapObject(object: Object, parentPath: string | null = null): Record<string, any> {
    return Object.entries(object)
      .reduce<Record<string, any>>((highlightResult, [childPath, value]) => {
        const nestedPath = !parentPath ? childPath : `${parentPath}.${childPath}`;

        if (!shouldHighlightField(nestedPath, highlightFields)) {
          return highlightResult;
        }

        const data = mapValue(value, nestedPath);

        if (data === null) {
          return highlightResult;
        }

        return {
          ...highlightResult,
          [childPath]: data
        };
      }, {});
  }

  return mapObject(hit?._source ?? {});
}
