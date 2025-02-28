 Option 1 :
 parent with position relative. This will determine the top anchor for the tooltip positioning
 that includes both the message and the target (As siblings ?)
 Can the target have a varying height ? (no, or only on resize)
 Do we want to hard code the positioning or determine a list of preferred positions ? 
  ["top-left", "bottom"]

  How do we manage the dimensions of the tooltip contents ? It won't be in the flow of the document, so it cannot adapt to the free space.

  We need to provide guidance on the preferred dimensions of the message.

  We cannot adapt both the dimensions of the tooltip and the positioning. We need to provide a list of preferred positions and hard code the dimensions. 

  A difference between a combobox tooltip and an info tooltip is that the combobox dimensions are set by the left:0 and right:0 of the parent. The info tooltip is not constrained by the parent.

  It means, we need a way to pass the tooltip dimensions, but we'll provide sane defaults.

  For a combobox/select/datepicker : 
  preferredPositions = ["top", "bottom"] for 100% of them
  left:0, right:0

  For a info tooltip :
  preferredPositions = ["top", "right"] for instance
  max-width: 300px

  Sane defaults for preferred positions would be  ["top", "bottom", "left", "right"]

  What does the hook do ? 
  - if ssr, return type-compatible empty values
  - We need to create a ref, and pass it to the position relative container.  
  - We read the ref's dimensions and position
      (This implies the ref contains fully the target and only the target)
  - We read the window dimensions
  - We need to listen to scroll/resize events
  - additionally, we need a parameter with the page gutter (css-style, for instance "1em 0 0 1em");
  - we need an additional parameter to determine the display distance btw target and msg (for instance if showing an arrow).
  - we need to memoize the last position of the target, changed on events
  - We need a second ref for the tooltip message
    - Once mounted, we read its dimensions. Ideally the display layer has provided a dimension constraint, such as left:0, right:0 or max-width: 300px
  - we need to return the position of the center of the preferred dimension (?)
  - so, 
    - initialize 2 refs
    - compute dimensions of tooltip msg
    - compute space between target and page edge - gutter
    - if space for tooltip msg  is enough, display there. Otherwise, try the next preferred position
    - return 
      - coordinates for absolute positioning - initial would be (0,0)
          - for left and right, default aligning to the top.(* we can review in the future)
      - which position was chosen
      - refs
    - Afterwards, add a simple visibility toggle with a useState managed by the hook. Return the tupple as well.
      - (We need to handle likely mouse / touch interactions)
    - Afterwards, listen to scroll and resize events.
    - Afterwards, optimize for performance.


  What does the display layer do ?
  - We create a container for the two siblings
  - We position the message absolutely based on the target's position
  - The message has its visibility toggled none
  - What is the ideal display layer ? 
      <Tooltip.Container> // Doesnt actually do anything aside from the relative pos
        <SomeTarget ref={targetRef}/>
        <Tooltip.Message ref={messageRef}/>
      </Tooltip.Container>
  - What is the ideal display layer ? 
      <SomeRandomContainer> // the only requirement is to have explicit positioning relative ! THIS requirement needs to be documented with the hook (!!!!)
        <SomeTarget ref={targetRef}/>
        <TooltipMessage ref={messageRef}/>
      </SomeRandomContainer>
    - Here the story would look like this : >>> For component creators 
      const SomeTooltippedButton = () => {
        const {
          targetRef,
          messageRef,
          position,
          isVisible,
          toggleVisibility
        } = useTooltip({ distance: "var(--arrow-distance)" });
        return (
          <SomeRandomContainer>
            <Button ref={targetRef}/>
            <TooltipMessage ref={messageRef}/>
          </SomeRandomContainer>
        )
      }
    - this story represents a manual mapping of the hook returns to dom elements. 
    - This is similar to real world scenarios as inputs, for instance
      const DatePicker = () => {
        const {
          targetRef,
          messageRef,
          position,
          isVisible,
          toggleVisibility
        } = useTooltip({preferredPositions: ["top", "bottom"]});
        return (
          <div class="parent">
            <input ref={targetRef}/>
            <Calendar ref={messageRef}/>
          </div>
        )
      }
    - Once we have this, the HOC is a helper (shortcut) to avoid doing the manual mapping
      const withTooltip(Target, message, {options}) => { >>> For consumers
        const {
          targetRef,
          messageRef,
          position,
          isVisible,
          toggleVisibility
        } = useTooltip(options);
        return (
          <div class="parent">
            <Target ref={targetRef}/>
            <Message ref={messageRef}/> // Where this maps to the Message component styled above.
          </div>
        )
      }
    - So we need stories that do this
      - Display the TooltipMessage component (independently from the tooltip hook)
          "RAW TooltipMessage"
      - Display the TooltipMessage component with the hook in a manual mapping mode
      - Display the TooltipMessage component with the hook in a HOC mode
      - This means (!!!) that the "Component" associated with the stories meta is not "really" the TooltipMessage - the stories are describing a pattern and an HOC. So we'll need to figure out what the story domain actually is.


  - This means the component we would create would only be the TooltipMessage but ... the stories would be done at the parent level with the hook invocation.
  - Another alternative is to provide the parent directly as well, such as TooltipContainer. Here, the hook invocation would be managed by the container, and the message would be automatically instantiated.
     - THis alternative can live together with the first one, the most gracious approach would be an HOC. withTooltip(Target, message, {options})
 */
