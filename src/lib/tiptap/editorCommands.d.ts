import type { CalloutType } from './calloutExtension'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (type?: CalloutType) => ReturnType
      toggleCallout: (type?: CalloutType) => ReturnType
    }
    comment: {
      setComment: (text: string) => ReturnType
      toggleComment: (text: string) => ReturnType
      unsetComment: () => ReturnType
    }
    mathInline: {
      insertMathInline: (latex: string) => ReturnType
    }
    mathBlock: {
      insertMathBlock: (latex: string) => ReturnType
    }
  }
}

export {}
