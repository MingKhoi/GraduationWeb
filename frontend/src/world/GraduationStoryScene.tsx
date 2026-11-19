type StorySceneStage = 'welcome' | 'walk' | 'letter' | 'invitation';
type StorySceneMotion = 'idle' | 'walking' | 'opening' | 'revealed';

type GraduationStorySceneProps = {
    stage: StorySceneStage;
    motion: StorySceneMotion;
};

const backgrounds: Record<StorySceneStage, string> = {
    welcome: '/storyboard/welcome.webp',
    walk: '/storyboard/walk.webp',
    letter: '/storyboard/letter.webp',
    invitation: '/storyboard/invitation-template.png',
};

export default function GraduationStoryScene({ stage, motion }: GraduationStorySceneProps) {
    return (
        <div
            key={`${stage}-${motion}`}
            className={`story-background story-background--${stage} story-background--${motion}`}
            style={{ backgroundImage: `url("${backgrounds[stage]}")` }}
            aria-hidden="true"
        />
    );
}
