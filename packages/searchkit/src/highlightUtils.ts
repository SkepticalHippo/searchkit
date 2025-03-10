import type { ElasticsearchHit, SearchSettingsConfig } from './types'

export function highlightTerm(value: string, query: string): string {
  const regex = new RegExp(query, 'gi')
  return value.replace(regex, (match) => `<em>${match}</em>`)
}

function getHighlightedValue(value: any, field: string, preTag: string, postTag: string, hitHighlights?: Record<string, string[]>): string | null {
  const highlightedValues = hitHighlights?.[field] || hitHighlights?.[`${field}.keyword`];

  if (highlightedValues?.length === 0) {
    return highlightedValues[0];
  }

  const highlightedRegex = new RegExp(`${preTag}(.*?)${postTag}`, 'g');

  return highlightedValues?.find((match: any) => match.replace(highlightedRegex, '$1') === value) || null;
}

export function getHighlightFields(
  hit: ElasticsearchHit,
  preTag: string = '<ais-highlight-0000000000>',
  postTag: string = '<ais-highlight-0000000000/>'
) {
  function mapValue(value: any, path: string): Record<string, any> | null {
    if (typeof value === "string") {
      const highlightedValue = getHighlightedValue(value, path, preTag, postTag, hit.highlight);

      if (!highlightedValue) {
        return {
          matchLevel: "none",
          matchedWords: [],
          value: value,
        };
      }

      const regex = new RegExp(`${preTag}(.*?)${postTag}`, "g");
      const matchedWords = [];
      let match;
      while ((match = regex.exec(highlightedValue)) !== null) {
        matchedWords.push(match[1]);
      }

      return {
        fullyHighlighted: true,
        matchLevel: "full",
        matchedWords,
        value: highlightedValue,
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
