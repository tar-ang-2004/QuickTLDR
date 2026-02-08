export interface TopicNode {
  topic: string;
  entryIds: string[];
}

interface GraphStore {
  topicNodes: Map<string, TopicNode>;
}

const store: GraphStore = {
  topicNodes: new Map()
};

function normalizeTopic(topic: string): string {
  return topic.toLowerCase().trim();
}

export function indexEntry(entry: { id: string; topics: string[] }): void {
  if (!entry.id || !entry.topics) {
    throw new Error("Invalid entry: id and topics required");
  }

  const uniqueTopics = new Set(
    entry.topics
      .filter(Boolean)
      .map(normalizeTopic)
      .filter(Boolean)
  );

  for (const topic of uniqueTopics) {

    let node = store.topicNodes.get(topic);
    
    if (!node) {
      node = {
        topic: topic,
        entryIds: []
      };
      store.topicNodes.set(topic, node);
    }

    if (!node.entryIds.includes(entry.id)) {
      node.entryIds.push(entry.id);
    }
  }
}

export function getTopic(topic: string): TopicNode | undefined {
  const normalized = normalizeTopic(topic);
  return store.topicNodes.get(normalized);
}

export function listTopics(): string[] {
  return Array.from(store.topicNodes.keys()).sort();
}

export function getEntriesForTopic(topic: string): string[] {
  const node = getTopic(topic);
  return node ? [...node.entryIds] : [];
}

export function clearGraph(): void {
  store.topicNodes.clear();
}

export function getTopicCount(): number {
  return store.topicNodes.size;
}

export function getTopTopics(limit: number = 10): Array<{ topic: string; count: number }> {
  const topics = Array.from(store.topicNodes.values())
    .map(node => ({
      topic: node.topic,
      count: node.entryIds.length
    }))
    .sort((a, b) => b.count - a.count);

  return topics.slice(0, limit);
}

export function findRelatedTopics(topic: string): string[] {
  const node = getTopic(topic);
  if (!node || node.entryIds.length === 0) {
    return [];
  }

  const relatedTopicCounts = new Map<string, number>();

  for (const entryId of node.entryIds) {
    for (const [topicKey, topicNode] of store.topicNodes) {
      if (topicKey === normalizeTopic(topic)) continue;
      
      if (topicNode.entryIds.includes(entryId)) {
        relatedTopicCounts.set(topicKey, (relatedTopicCounts.get(topicKey) || 0) + 1);
      }
    }
  }

  return Array.from(relatedTopicCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);
}

export function removeEntryFromGraph(entryId: string): void {
  for (const node of store.topicNodes.values()) {
    const index = node.entryIds.indexOf(entryId);
    if (index !== -1) {
      node.entryIds.splice(index, 1);
    }
  }

  const emptyTopics: string[] = [];
  for (const [topic, node] of store.topicNodes) {
    if (node.entryIds.length === 0) {
      emptyTopics.push(topic);
    }
  }

  for (const topic of emptyTopics) {
    store.topicNodes.delete(topic);
  }
}
