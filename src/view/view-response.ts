/**
 * ViewResponse — returned by Controller.view() for SSR-rendered views.
 */
export class ViewResponse {
	constructor(
		public readonly name: string,
		public readonly props: Record<string, any> = {},
		public readonly options: { title?: string; scripts?: string[] } = {},
	) {}
}
