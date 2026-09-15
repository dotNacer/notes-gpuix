/**
 * Serveur MCP: donne a une IA (Claude, etc.) un acces en lecture/ecriture aux
 * memes fichiers markdown que l'app native. Le disque (NOTES_DIR) est la
 * seule source de verite - aucune sync a maintenir entre les deux surfaces.
 *
 * Lancement: npm run mcp (stdio transport, a brancher dans la config MCP
 * d'un client comme Claude Desktop / Hermes).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { listNotes, readNote, writeNote, createNote, deleteNote, searchNotes } from '../lib/notes.ts';

const server = new McpServer({ name: 'notes-gpuix', version: '0.1.0' });

server.registerTool(
	'list_notes',
	{
		title: 'Lister les notes',
		description: "Liste toutes les notes avec leur id, titre et date de derniere modification.",
		inputSchema: {}
	},
	async () => {
		const notes = listNotes();
		return { content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }] };
	}
);

server.registerTool(
	'read_note',
	{
		title: 'Lire une note',
		description: 'Retourne le contenu markdown complet d\'une note par son id.',
		inputSchema: { id: z.string().describe('id de la note (voir list_notes)') }
	},
	async ({ id }) => {
		try {
			const content = readNote(id);
			return { content: [{ type: 'text', text: content }] };
		} catch (err) {
			return { content: [{ type: 'text', text: String((err as Error).message) }], isError: true };
		}
	}
);

server.registerTool(
	'create_note',
	{
		title: 'Creer une note',
		description: 'Cree une nouvelle note avec le contenu donne, la place en derniere position.',
		inputSchema: { content: z.string().default('').describe('contenu markdown initial') }
	},
	async ({ content }) => {
		const note = createNote(content);
		return { content: [{ type: 'text', text: JSON.stringify(note, null, 2) }] };
	}
);

server.registerTool(
	'update_note',
	{
		title: 'Modifier une note',
		description: 'Remplace le contenu complet d\'une note existante par son id.',
		inputSchema: { id: z.string(), content: z.string() }
	},
	async ({ id, content }) => {
		writeNote(id, content);
		return { content: [{ type: 'text', text: `Note ${id} mise a jour.` }] };
	}
);

server.registerTool(
	'delete_note',
	{
		title: 'Supprimer une note',
		description: 'Supprime definitivement une note par son id.',
		inputSchema: { id: z.string() }
	},
	async ({ id }) => {
		deleteNote(id);
		return { content: [{ type: 'text', text: `Note ${id} supprimee.` }] };
	}
);

server.registerTool(
	'search_notes',
	{
		title: 'Rechercher dans les notes',
		description: 'Recherche une sous-chaine (insensible a la casse) dans le titre ou le contenu de toutes les notes.',
		inputSchema: { query: z.string() }
	},
	async ({ query }) => {
		const results = searchNotes(query);
		return { content: [{ type: 'text', text: JSON.stringify(results, null, 2) }] };
	}
);

const transport = new StdioServerTransport();
await server.connect(transport);
