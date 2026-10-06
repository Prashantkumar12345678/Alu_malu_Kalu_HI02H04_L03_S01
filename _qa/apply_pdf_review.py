from pathlib import Path
import copy, json, re

root = Path(__file__).resolve().parent.parent
path = root / 'index.html'
source = path.read_text(encoding='utf-8')
match = re.search(r'(<script type="application/json" id="cardData">)(.*?)(</script>)', source, re.S)
card = json.loads(match[2])
backup = root / '_qa' / 'before_pdf_review'
backup.mkdir(exist_ok=True)
for filename in ('index.html', 'app.js', 'style.css'):
    target = backup / filename
    if not target.exists():
        target.write_bytes((root / filename).read_bytes())
original = {s['id']: copy.deepcopy(s) for s in card['slides']}
voices = {}
def voice(name, text):
    key = 'vo_review_' + name
    voices[key] = text
    card['assets']['audio'][key] = 'assets/Audio/' + key + '.mp3'
    card['assets']['audio_text'][key] = text
    return key

card['assets']['audio']['vo_landing'] = 'assets/Audio/vo_review_landing.mp3'
card['assets']['audio_text']['vo_landing'] = 'नमस्ते दोस्त, मैं हूँ स्विफ़्टी। आज हम एक कहानी पढ़ेंगे—कालू-मालू-आलू।'
voice('landing', card['assets']['audio_text']['vo_landing'])

def transition(id, text):
    s=original[id]
    s['prompt_hi']=s['data']['headline_hi']=text
    s['audio']['prompt']=voice(id.lower(),text)
    return s
pt1=transition('PT1','ध्यान से देखिए और मेरे साथ पढ़िए। चलिए, शुरू करें।')
pt2=transition('PT2','आपने कहानी पढ़ ली। अब हम साथ मिलकर प्रश्नों के उत्तर देते हैं। चलिए, साथ में करें।')
pt3=transition('PT3','वाह! अब आपकी बारी।')
reading_instruction=voice('reading_instruction','इस बटन पर टैप करिए और वाक्य पढ़िए।')
stories = [
 ('T1','scene_1','मालू आज पहली बार बगीचे से सब्ज़ी तोड़ने गया।'),
 ('T1B','scene_1','मालू ने तोड़े लाल टमाटर, लंबे बैंगन और हरी-भरी भिंडी।'),
 ('T2','scene_2','दादी ने कहा, “शाबाश मालू! जाओ थोड़े आलू भी ले आओ।”'),
 ('T3','scene_3','मालू ने सारे पेड़, बेलें और पौधे देखे। आलू कहीं दिखाई नहीं दिए।'),
 ('T4','scene_4','“दादी, आलू अभी उगे नहीं हैं।” मालू ने खाली टोकरी रख दी।'),
 ('T4B','scene_4','दादी ने कहा, “ध्यान से देखो मालू, बहुत आलू उग रहे हैं।”'),
 ('T5','scene_5','मालू फिर गया बगीचे में। पीछे-पीछे कालू भी चल पड़ा।'),
 ('T6','scene_6','मालू आलू खोज रहा था कि उसे सुनाई दिया, “भौं, भौं, भौं।” कालू ने मिट्टी खोदी हुई थी, उसमें से निकले मोटे-मोटे आलू।'),
 ('T7','scene_7','“वाह कालू! ढूँढ निकाले आलू।” टोकरी भरकर बोला मालू।'),
]
story_slides=[]
for n,(id,img,text) in enumerate(stories):
    story_slides.append({'id':id,'phase':'tutorial','eis':'iconic','type':'STORY_READALONG',
        'prompt_hi':'कहानी पढ़िए', 'audio':{'prompt':reading_instruction},
        'data':{'passage':{'image_id':img,'lines':[{'text':text,'audio':voice('story_'+str(n+1),text)}]},
                'read_with_mic':True,'page_no':n+1,'page_total':len(stories)},'signals':{'on_complete':[]}})

identify={'id':'G0','phase':'guided','eis':'iconic','type':'TAP_IN_SCENE',
    'prompt_hi':'चित्र में मालू कौन है?',
    'audio':{'prompt':voice('identify','इस चित्र में मालू कौन है? चित्र पर टैप करके बताइए।'),
             'try_again':voice('identify_hint1','फिर से कोशिश कीजिए, मालू को पहचानिए।'),
             'hint':voice('identify_hint2','कालू, मालू।'),
             'reveal':voice('identify_hint3','यह मालू का चित्र है। इसपर टैप कीजिए।'),
             'correct':voice('identify_correct','मालू।')},
    'data':{'image_id':'scene_5','visible_boxes':True,'identify_sequence':True,
      'hotspots':[{'x':42,'y':57,'w':23,'h':42,'correct':False,'label_hi':'कालू'},
                  {'x':26,'y':0,'w':28,'h':99,'correct':True,'label_hi':'मालू'}],
      'signal_name':'scene_tap_first_try'}, 'signals':{'on_complete':[]}}

def hints(slide, name, options, answer, remember=False):
    d=slide['data']; d.update(auto=False,shuffle=False,evidence=[],highlight=False)
    d['options']=options
    slide['audio']={
       'prompt':voice(name+'_prompt',slide['prompt_hi']+' '+ '। '.join(o['label_hi'] for o in options)+'।'),
       'try_again':voice(name+'_hint1','फिर से कोशिश कीजिए'+(', कहानी याद कीजिए।' if remember else '।')),
       'hint':voice(name+'_hint2',', '.join(o['label_hi'] for o in options)+'।'),
       'reveal':voice(name+'_hint3',answer+' यह सही उत्तर है, इसपर टैप कीजिए।'),
       'correct':next(o['audio'] for o in options if o.get('correct'))}
    return slide

g1=original['G1']
g1['prompt_hi']='मालू ने बगीचे से कौन-सी सब्ज़ी तोड़ी?'
hints(g1,'vegetable',g1['data']['options'],'मालू ने बगीचे से टमाटर तोड़े।',True)

soil=original['G4'];soil['id']='P_SOIL';soil['phase']='practice';soil['data']['mastery']=True
soil_options=[{'img':'opt_ped','label_hi':'पेड़ पर','audio':'vo_o_opt_ped'},
 {'img':'opt_mitti','label_hi':'मिट्टी के अंदर','audio':'vo_o_opt_mitti','correct':True},
 {'img':'opt_water','label_hi':'पानी के अंदर','audio':voice('water_option','पानी के अंदर।')}]
hints(soil,'soil',soil_options,'आलू मिट्टी के अंदर उगते हैं।')
sad=original['P2'];sad['data']['options']=sorted(sad['data']['options'],key=lambda o:['उदास','डरा हुआ','खुश'].index(o['label_hi']))
hints(sad,'sad',sad['data']['options'],'मालू उदास हो गया था।')
basket=original['G2'];basket['id']='P_BASKET';basket['phase']='practice';basket['data']['mastery']=True
basket['prompt_hi']='मालू ने दादी के आगे खाली टोकरी क्यों रख दी थी?'
basket['data']['passage']['image_id']='scene_empty_basket'
basket['data']['options']=sorted(basket['data']['options'],key=lambda o:['उसे भूख लगी थी','उसे आलू नहीं मिले','टोकरी टूट गई थी'].index(o['label_hi']))
hints(basket,'basket',basket['data']['options'],'उसे आलू नहीं मिले थे।',True)
last=original['P4'];last['data'].update(shuffle=False,evidence=[],highlight=False)
intro={'id':'PUZZLE_INTRO','phase':'practice','eis':'iconic','type':'PICTURE_PUZZLE',
 'prompt_hi':'प्रश्नों के उत्तर देकर चित्र पूरा कीजिए।',
 'audio':{'prompt':voice('puzzle_intro','प्रश्नों के उत्तर देकर चित्र पूरा कीजिए।')},
 'data':{'image_id':'scene_7'},'signals':{'on_complete':[]}}
for s in [soil,sad,basket,last]:
    s['data']['puzzle']=True
    s['data']['puzzle_image']='scene_7'

celebrate=original['CEL']
celebrate['prompt_hi']='शाबाश! आपने कहानी ध्यान से पढ़ी और सभी प्रश्नों के उत्तर दे दिए।'
celebrate['audio']['prompt']=voice('celebrate',celebrate['prompt_hi'])
card['slides']=[pt1,*story_slides,pt2,identify,original['T8'],original['T9'],g1,pt3,intro,soil,sad,basket,last,celebrate]
card['phase_distribution']={phase:sum(s['phase']==phase for s in card['slides']) for phase in ('tutorial','guided','practice')}
card['assets']['image']['opt_water']='assets/Images/opt_water.svg'
card['assets']['image']['scene_empty_basket']='assets/Images/scene_empty_basket.png'
card['review_source']='HI02H04_L03_S01_review.pptx.pdf · Recommendations only'
card['signals_expected']=[x for x in card['signals_expected'] if not any(k in x for k in ('find_evidence','sort_qtype'))]
path.write_text(source[:match.start(2)]+json.dumps(card,ensure_ascii=False)+source[match.end(2):],encoding='utf-8')
(root/'_qa'/'review_voices.json').write_text(json.dumps(voices,ensure_ascii=False,indent=2),encoding='utf-8')
print('Applied Recommendations: 9 story pages, 4 guided questions, 4 practice puzzle questions.')
