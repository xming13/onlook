import { useEditorEngine } from '@/components/Context';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type { CodeDiffRequest } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { TemplateNode } from '@onlook/models/element';
import { Icons } from '@onlook/ui/icons';
import { Textarea } from '@onlook/ui/textarea';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';

const TailwindInput = observer(() => {
    const editorEngine = useEditorEngine();
    const [currentSelector, setSelector] = useState<string | null>(null);

    const instanceRef = useRef<HTMLTextAreaElement>(null);
    const [instance, setInstance] = useState<TemplateNode | undefined>();
    const [instanceClasses, setInstanceClasses] = useState<string>('');
    const [isInstanceFocused, setIsInstanceFocused] = useState(false);

    const rootRef = useRef<HTMLTextAreaElement>(null);
    const [root, setRoot] = useState<TemplateNode | undefined>();
    const [rootClasses, setRootClasses] = useState<string>('');
    const [isRootFocused, setIsRootFocused] = useState(false);

    useEffect(() => {
        if (editorEngine.elements.selected.length > 0) {
            const selectedEl = editorEngine.elements.selected[0];
            if (selectedEl.selector === currentSelector) {
                return;
            }
            setSelector(selectedEl.selector);
            getInstanceClasses(selectedEl.selector);
            getRootClasses(selectedEl.selector);
        } else {
            setSelector(null);
            setInstance(undefined);
            setRoot(undefined);
            setInstanceClasses('');
            setRootClasses('');
        }
    }, [editorEngine.elements.selected, editorEngine.ast.layers]);

    async function getInstanceClasses(selector: string) {
        const newInstance = editorEngine.ast.getInstance(selector);
        setInstance(newInstance);
        if (newInstance) {
            const instanceClasses: string[] = await invokeMainChannel(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                newInstance,
            );
            setInstanceClasses(instanceClasses.join(' '));
        }
    }

    async function getRootClasses(selector: string) {
        const newRoot = editorEngine.ast.getRoot(selector);
        setRoot(newRoot);
        if (newRoot) {
            const rootClasses: string[] = await invokeMainChannel(
                MainChannels.GET_TEMPLATE_NODE_CLASS,
                newRoot,
            );
            setRootClasses(rootClasses.join(' '));
        }
    }

    const createCodeDiffRequest = async (templateNode: TemplateNode, className: string) => {
        if (!currentSelector) {
            return;
        }
        const request: CodeDiffRequest = {
            templateNode,
            selector: currentSelector,
            attributes: { className },
            insertedElements: [],
            movedElements: [],
            removedElements: [],
            groupElements: [],
            ungroupElements: [],
            overrideClasses: true,
        };
        const res = await editorEngine.code.getAndWriteCodeDiff([request]);
        if (res) {
            sendAnalytics('tailwind action');
        }
    };

    function handleKeyDown(e: any) {
        if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape') {
            e.target.blur();
            e.preventDefault();
        }
    }

    const adjustHeight = (textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight + 20}px`;
    };

    useEffect(() => {
        if (instanceRef.current) {
            adjustHeight(instanceRef.current);
        }
    }, [instanceClasses]);

    useEffect(() => {
        if (rootRef.current) {
            adjustHeight(rootRef.current);
        }
    }, [rootClasses]);

    const EnterIndicator = () => {
        return (
            <div className="absolute bottom-1 right-2 text-xs text-gray-500 flex items-center">
                <span>enter to apply</span>
                <Icons.Reset className="ml-1" />
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-2 text-xs text-foreground-onlook">
            {instance && <p>Instance</p>}
            {instance && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={instanceRef}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0"
                            placeholder="Add tailwind classes here"
                            value={instanceClasses}
                            onInput={(e: any) => setInstanceClasses(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={(e) => {
                                setIsInstanceFocused(false);
                                instance && createCodeDiffRequest(instance, e.target.value);
                            }}
                            onFocus={() => setIsInstanceFocused(true)}
                        />
                    </div>
                    {isInstanceFocused && <EnterIndicator />}
                </div>
            )}

            {instance && root && <p>Component</p>}
            {root && (
                <div className="relative">
                    <div>
                        <Textarea
                            ref={rootRef}
                            className="w-full text-xs text-foreground-active break-normal bg-background-onlook/75 focus-visible:ring-0 resize-none"
                            placeholder="Add tailwind classes here"
                            value={rootClasses}
                            onInput={(e: any) => setRootClasses(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={(e) => {
                                setIsRootFocused(false);
                                root && createCodeDiffRequest(root, e.target.value);
                            }}
                            onFocus={() => setIsRootFocused(true)}
                        />
                    </div>
                    {isRootFocused && <EnterIndicator />}
                </div>
            )}
        </div>
    );
});

export default TailwindInput;
